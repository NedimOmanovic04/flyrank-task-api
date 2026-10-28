const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
// Run only against an explicitly designated disposable test database.
if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a disposable Postgres database');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { Pool } = require('pg');
const app = require('../server');
const db = require('../db');

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : null;
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          text: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Task API Postgres Integration Tests', () => {
  before(async () => {
    await db.initialize();
    const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      await admin.query('TRUNCATE tasks RESTART IDENTITY');
    } finally {
      await admin.end();
    }
    await db.initialize();
    await db.initialize();
    await db.initialize();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.close();
  });

  test('GET / returns API metadata', async () => {
    const res = await request('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Task API');
    assert.equal(res.body.version, '1.0');
    assert.ok(res.body.endpoints.includes('/tasks'));
  });

  test('GET /health returns status ok', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  test('GET /tasks returns all 3 seeded tasks with boolean done', async () => {
    const res = await request('/tasks');
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body.length, 3);
    assert.equal(res.body[0].title, 'Learn HTTP basics');
    assert.equal(res.body[0].done, true);
    assert.equal(res.body[1].done, false);
  });

  test('GET /tasks/:id returns single task', async () => {
    const res = await request('/tasks/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 1);
    assert.equal(res.body.title, 'Learn HTTP basics');
    assert.equal(res.body.done, true);
  });

  test('GET /tasks/:id returns 404 for non-existent task', async () => {
    const res = await request('/tasks/999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  test('POST /tasks creates task with 201 Created and persists in Postgres', async () => {
    const res = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { title: 'Write automated tests' }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.id, 4);
    assert.equal(res.body.title, 'Write automated tests');
    assert.equal(res.body.done, false);

    // Verify directly in database
    const row = await db.find(4);
    assert.ok(row);
    assert.equal(row.title, 'Write automated tests');
    assert.equal(row.done, false);
  });

  test('POST /tasks rejects missing or empty title with 400', async () => {
    const res1 = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { title: '   ' }
    });
    assert.equal(res1.status, 400);

    const res2 = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    });
    assert.equal(res2.status, 400);
  });

  test('PUT /tasks/:id updates title and done with 200 OK', async () => {
    const res = await request('/tasks/4', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { title: 'Write automated tests with node:test', done: true }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Write automated tests with node:test');
    assert.equal(res.body.done, true);

    const row = await db.find(4);
    assert.equal(row.title, 'Write automated tests with node:test');
    assert.equal(row.done, true);
  });

  test('PUT /tasks/:id returns 404 for non-existent ID', async () => {
    const res = await request('/tasks/999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { done: true }
    });
    assert.equal(res.status, 404);
  });

  test('PUT /tasks/:id returns 400 for empty update body or invalid types', async () => {
    const res1 = await request('/tasks/4', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    });
    assert.equal(res1.status, 400);

    const res2 = await request('/tasks/4', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { done: 'not-a-boolean' }
    });
    assert.equal(res2.status, 400);
  });

  test('DELETE /tasks/:id removes task with 204 No Content', async () => {
    const res = await request('/tasks/4', {
      method: 'DELETE'
    });
    assert.equal(res.status, 204);
    assert.equal(res.text, '');

    const row = await db.find(4);
    assert.equal(row, undefined);
  });

  test('DELETE /tasks/:id returns 404 for already deleted or missing ID', async () => {
    const res = await request('/tasks/4', {
      method: 'DELETE'
    });
    assert.equal(res.status, 404);
  });

  test('Extras: GET /tasks?search=curl returns matching task', async () => {
    const res = await request('/tasks?search=curl');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, 'Test endpoints with curl');
  });

  test('Extras: GET /tasks?done=true filters completed tasks', async () => {
    const res = await request('/tasks?done=true');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, 1);
  });

  test('Extras: GET /tasks?sort=title sorts alphabetically', async () => {
    const res = await request('/tasks?sort=title');
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, 'Build a CRUD API');
    assert.equal(res.body[1].title, 'Learn HTTP basics');
    assert.equal(res.body[2].title, 'Test endpoints with curl');
  });

  test('Extras: GET /stats returns real database counts via SQL', async () => {
    const res = await request('/stats');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      total: 3,
      completed: 1,
      pending: 2
    });
  });

  test('SQL input remains data and invalid IDs return JSON 404', async () => {
    const title = "Robert'); DROP TABLE tasks; --";
    const created = await request('/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { title }
    });
    assert.equal(created.status, 201);
    assert.equal((await db.find(created.body.id)).title, title);
    const search = await request('/tasks?search=' + encodeURIComponent("' OR TRUE --"));
    assert.equal(search.status, 200);
    assert.equal(search.body.length, 0);
    for (const id of ['abc', '1x', '2147483648', '-1']) {
      const result = await request('/tasks/' + id);
      assert.equal(result.status, 404);
      assert.deepEqual(result.body, { error: 'Task not found' });
    }
    await request('/tasks/' + created.body.id, { method: 'DELETE' });
  });

  test('malformed JSON returns a JSON 400 response', async () => {
    const result = await request('/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken'
    });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { error: 'Invalid JSON body' });
  });

  test('partial updates preserve other fields and repeated initialization preserves rows', async () => {
    const result = await request('/tasks/2', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: { done: true }
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.title, 'Build a CRUD API');
    assert.equal(result.body.done, true);
    await Promise.all([db.initialize(), db.initialize(), db.initialize()]);
    assert.equal((await db.list()).length, 3);
    assert.equal((await db.find(2)).done, true);
  });
});
