const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../server');
const { classify } = require('../src/llm/triage');
const { completion, retryAfter } = require('../src/llm/client');

let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await require('node:events').once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => server.close());
const post = body => fetch(base + '/triage', { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('reject invalid input, return a validated stub, and honor disable ahead of stub', async () => {
  process.env.LLM_STUB = '1';
  for (const body of [{}, { text: 3 }, { text: ' ' }, { text: 'a'.repeat(2001) }]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /text/);
  }
  assert.deepEqual(await (await post({ text: 'hi' })).json(), { category: 'other', confidence: 0 });
  process.env.LLM_ENABLED = 'false';
  assert.equal((await post({ text: 'hi' })).status, 503);
});

test('repair uses the rejected answer and keeps the original user message', async () => {
  let calls = 0;
  const result = await classify('broken export', async (messages, { repair }) => {
    calls++;
    if (!repair) return '{"category":"typo","confidence":1}';
    assert.match(messages[2].content, /typo/);
    assert.match(messages[3].content, /category/);
    return 'Here is the answer:\n```json\n{"category":"bug","confidence":1}\n```';
  });
  assert.equal(calls, 2);
  assert.equal(result.category, 'bug');
});

test('a second invalid answer gets quarantined and returns 422', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'triage-'));
  const file = path.join(dir, 'quarantine.jsonl');
  try {
    let calls = 0;
    await assert.rejects(classify('something', async () => { calls++; return 'broken'; }, file), { publicStatus: 422 });
    assert.equal(calls, 2);
    assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).raw, 'broken');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('401 fails immediately and 429 with Retry-After retries once before success', async t => {
  Object.assign(process.env, { LLM_BASE_URL: 'http://provider.invalid', LLM_MODEL: 'test', LLM_API_KEY: 'test' });
  let status = 401;
  const mock = t.mock.method(global, 'fetch', async () => {
    if (status === 200) return Response.json({ choices: [{ message: { content: 'ok' } }] });
    const response = new Response(null, { status, headers: { 'Retry-After': '0' } });
    status = 200;
    return response;
  });
  await assert.rejects(completion([]), { publicStatus: 502 });
  assert.equal(mock.mock.callCount(), 1);
  status = 429;
  assert.equal(await completion([]), 'ok');
  assert.equal(mock.mock.callCount(), 3);
  assert.equal(retryAfter('7'), 7000);
  assert.equal(retryAfter('Thu, 01 Jan 1970 00:00:00 GMT'), 0);
});
