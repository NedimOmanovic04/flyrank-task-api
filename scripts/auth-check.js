const assert = require('node:assert/strict');

// Credentials come only from the ignored .env or shell; never print tokens or passwords.
const { AUTH_TEST_EMAIL: email, AUTH_TEST_PASSWORD: password } = process.env;
const base = process.env.AUTH_TEST_BASE_URL || 'http://localhost:3000';

async function request(path, expected, { method = 'GET', body, token } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  assert.equal(response.status, expected,
    method + ' ' + path + ': expected ' + expected + ', received ' + response.status);
  console.log(method + ' ' + path + ' -> ' + response.status);
  return { response, body: text ? JSON.parse(text) : null, text };
}

async function main() {
  if (!email || !password) throw new Error('Set AUTH_TEST_EMAIL and AUTH_TEST_PASSWORD in your local .env');
  if (process.argv.includes('--signup')) {
    await request('/auth/signup', 201, { method: 'POST', body: { email, password } });
    console.log('Click the Supabase confirmation email, then run npm run test:live.');
    return;
  }

  await request('/public/info', 200);
  for (const path of ['/auth/signup', '/auth/login']) {
    await request(path, 400, { method: 'POST', body: {} });
  }
  await request('/auth/login', 401, { method: 'POST', body: { email, password: password + '-wrong' } });
  const { body: session } = await request('/auth/login', 200, { method: 'POST', body: { email, password } });
  assert.ok(session.access_token && session.refresh_token, 'Login must return both tokens');
  const token = session.access_token;
  const parts = token.split('.');
  parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
  for (const path of ['/protected/profile', '/protected/dashboard']) {
    await request(path, 401);
    await request(path, 401, { token: parts.join('.') });
    const { body } = await request(path, 200, { token });
    if (path.endsWith('profile')) {
      assert.equal(body.email.toLowerCase(), email.trim().toLowerCase());
      assert.ok(body.id && body.created_at);
    }
  }
  await request('/auth/logout', 401, { method: 'POST' });
  await request('/auth/logout', 401, { method: 'POST', token: parts.join('.') });
  const logout = await request('/auth/logout', 204, { method: 'POST', token });
  assert.equal(logout.text, '', 'Logout must have no response body');
  console.log('Real Supabase auth checks passed. Credentials and tokens were not printed.');
}

main().catch(error => {
  console.error('Auth checkpoint failed:', error.message);
  process.exitCode = 1;
});
