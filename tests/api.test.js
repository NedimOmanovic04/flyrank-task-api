const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
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

describe('Task API SQLite Integration Tests', () => {
  before(async () => {
    // Reset database to initial seed state
    db.exec("DELETE FROM tasks; DELETE FROM sqlite_sequence WHERE name='tasks';");
    const insert = db.prepare('INSERT INTO tasks (id, title, done) VALUES (?, ?, ?)');
    insert.run(1, 'Learn HTTP basics', 1);
    insert.run(2, 'Build a CRUD API', 0);
    insert.run(3, 'Test endpoints with curl', 0);

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

  test('POST /tasks creates task with 201 Created and persists in SQLite', async () => {
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
    const row = db.prepare('SELECT * FROM tasks WHERE id = 4').get();
    assert.ok(row);
    assert.equal(row.title, 'Write automated tests');
    assert.equal(row.done, 0);
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

    const row = db.prepare('SELECT * FROM tasks WHERE id = 4').get();
    assert.equal(row.title, 'Write automated tests with node:test');
    assert.equal(row.done, 1);
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

    const row = db.prepare('SELECT * FROM tasks WHERE id = 4').get();
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
});
