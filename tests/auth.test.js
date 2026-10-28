const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { createAuthRouter } = require('../auth');
const spec = require('../openapi.json');

// Exercise real Supabase SDK HTTP requests with an isolated fake Auth service.
// These checks do not claim to validate a real project's signing keys or settings.
const users = {
  alice: { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.com', created_at: '2026-01-01T00:00:00Z' },
  bob: { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.com', created_at: '2026-02-01T00:00:00Z' }
};
const calls = [];
const revoked = [];
let server, base;
const tokens = Object.fromEntries(Object.keys(users).map(name => [name,
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' +
  Buffer.from(JSON.stringify({ sub: users[name].id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture-signature'
]));

async function fakeSupabase(url, options) {
  const target = new URL(url);
  const headers = new Headers(options.headers);
  assert.equal(headers.get('apikey'), 'fixture-publishable-key');
  const body = options.body ? JSON.parse(options.body) : null;
  const token = (headers.get('authorization') || '').replace(/^Bearer /, '');
  calls.push({ path: target.pathname, token, body });
  const reply = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' }
  });
  if (target.pathname.endsWith('/signup')) {
    if (body.password.length < 6) return reply({ msg: 'Password too short' }, 422);
    return reply({ ...users.alice, identities: [] });
  }
  if (target.pathname.endsWith('/token')) {
    assert.equal(target.searchParams.get('grant_type'), 'password');
    const name = body.email.split('@')[0];
    if (!users[name] || body.password !== 'correct-password') {
      return reply({ msg: 'Sensitive upstream error', code: 'invalid_credentials' }, 400);
    }
    return reply({ access_token: tokens[name], refresh_token: name + '-refresh', expires_in: 3600,
      token_type: 'bearer', user: users[name] });
  }
  if (target.pathname.endsWith('/user')) {
    const name = Object.keys(tokens).find(name => tokens[name] === token);
    return name ? reply(users[name]) : reply({ msg: 'Invalid token', code: 'bad_jwt' }, 401);
  }
  if (target.pathname.endsWith('/logout')) {
    assert.equal(target.searchParams.get('scope'), 'local');
    assert.ok(Object.values(tokens).includes(token));
    revoked.push(token);
    return new Response(null, { status: 204 });
  }
  throw new Error('Unexpected SDK request');
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(() => createClient('https://fixture.supabase.co', 'fixture-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fakeSupabase }
  })));
  app.use((error, req, res, next) => {
    res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ error: 'Request failed' });
  });
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function post(path, body, token) {
  return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
}

test('public info works without a token or a Supabase request', async () => {
  const count = calls.length;
  const response = await fetch(base + '/public/info');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: 'Welcome stranger! This info is public.' });
  assert.equal(calls.length, count);
});

test('signup and login reject missing, blank and non-string fields before calling Supabase', async () => {
  const count = calls.length;
  for (const route of ['/auth/signup', '/auth/login']) {
    for (const body of [undefined, {}, null, { email: 'a@b.com' }, { password: 'secret' },
      { email: ' ', password: 'secret' }, { email: 5, password: 'secret' },
      { email: 'a@b.com', password: [] }, { email: 'a@b.com', password: ' ' }]) {
      const response = await post(route, body);
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, 'string');
    }
  }
  assert.equal(calls.length, count);
});

test('signup returns 201 and user even when email confirmation leaves session empty', async () => {
  const response = await post('/auth/signup', { email: 'alice@example.com', password: 'correct-password' });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.id, users.alice.id);
});

test('signup upstream validation returns 400', async () => {
  assert.equal((await post('/auth/signup', { email: 'alice@example.com', password: 'short' })).status, 400);
});

test('login returns session tokens and prevents caching', async () => {
  const response = await post('/auth/login', { email: ' alice@example.com ', password: 'correct-password' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = await response.json();
  assert.equal(session.access_token, tokens.alice);
  assert.equal(session.refresh_token, 'alice-refresh');
  assert.equal(session.token_type, 'bearer');
  assert.ok(session.expires_in > 0);
});

test('wrong password returns 401 and hides upstream details', async () => {
  const response = await post('/auth/login', { email: 'alice@example.com', password: 'wrong-password' });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Invalid login credentials' });
});

for (const path of ['/protected/profile', '/protected/dashboard', '/auth/logout']) {
  test(path + ' rejects missing and malformed headers before calling Supabase', async () => {
    const count = calls.length;
    for (const header of ['', 'Basic xyz', 'Bearer', 'Bearer ', 'Bearertoken', 'Bearer a b', 'Bearer a, Bearer b']) {
      const response = await fetch(base + path, { method: path.includes('logout') ? 'POST' : 'GET',
        headers: header ? { Authorization: header } : {} });
      assert.equal(response.status, 401, header);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
      assert.deepEqual(await response.json(), { error: 'Access token required' });
    }
    assert.equal(calls.length, count);
  });
  test(path + ' rejects tampered or expired tokens', async () => {
    for (const token of [tokens.alice + 'x', 'expired-token']) {
      const response = await fetch(base + path, { method: path.includes('logout') ? 'POST' : 'GET',
        headers: { Authorization: 'Bearer ' + token } });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Invalid or expired token' });
    }
  });
}

test('valid bearer profile exposes only selected verified metadata', async () => {
  const response = await fetch(base + '/protected/profile', { headers: { Authorization: 'bEaReR ' + tokens.alice } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), users.alice);
});

test('dashboard accepts a verified bearer token', async () => {
  const response = await fetch(base + '/protected/dashboard', { headers: { Authorization: 'Bearer ' + tokens.bob } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user_id, users.bob.id);
});

test('concurrent users stay isolated and logout forwards only the caller token', async () => {
  const sessions = await Promise.all(Object.keys(users).map(async name => {
    const response = await post('/auth/login', { email: users[name].email, password: 'correct-password' });
    return response.json();
  }));
  const responses = await Promise.all(sessions.map(session => post('/auth/logout', undefined, session.access_token)));
  for (const response of responses) {
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
  }
  assert.deepEqual(new Set(revoked), new Set(Object.values(tokens)));
});

test('Swagger bearer scheme protects only the intended auth routes', () => {
  assert.equal(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
  for (const [path, method] of [['/protected/profile', 'get'], ['/protected/dashboard', 'get'], ['/auth/logout', 'post']]) {
    assert.deepEqual(spec.paths[path][method].security, [{ bearerAuth: [] }]);
  }
  for (const [path, method] of [['/public/info', 'get'], ['/auth/signup', 'post'], ['/auth/login', 'post']]) {
    assert.equal(spec.paths[path][method].security, undefined);
  }
});
