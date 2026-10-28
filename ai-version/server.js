const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001; // uses a different port for quarantine testing

app.use(express.json());

// 1. Initialize SQLite Database
const db = new Database(path.join(__dirname, 'tasks.db'));

// 2. Create tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// 3. Seed initial tasks if table is empty
const rowCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
if (rowCount.count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Learn HTTP basics', 1);
  insert.run('Build a CRUD API', 0);
  insert.run('Test endpoints with curl', 0);
  console.log('Seeded 3 tasks.');
}

// 4. Endpoints
// GET /tasks
app.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

// GET /tasks/:id
app.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(title.trim(), 0);
  res.status(201).json({
    id: result.lastInsertRowid,
    title: title.trim(),
    done: 0
  });
});

// PUT /tasks/:id
app.put('/tasks/:id', (req, res) => {
  const { title, done } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Missing title or done' });
  }

  const newTitle = title !== undefined ? title.trim() : task.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).send();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AI version running on http://localhost:${PORT}`);
  });
}

module.exports = app;
