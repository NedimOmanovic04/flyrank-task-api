const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());


// Stage 1
app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks', '/stats', '/docs']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper to ensure response shape matches Assignment 1 (boolean done)
const formatTask = (task) => ({
  ...task,
  done: Boolean(task.done)
});

// Stage 1 & Extras: read tasks with optional search, filter, and sort
app.get('/tasks', (req, res) => {
  const { search, done, sort, order } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }

  if (done !== undefined) {
    if (done === 'true' || done === '1') {
      query += ' AND done = 1';
    } else if (done === 'false' || done === '0') {
      query += ' AND done = 0';
    }
  }

  const allowedSortFields = ['id', 'title', 'done'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'id';
  const sortOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(formatTask));
});

// Extras: Real database statistics computed via SQL
app.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const completed = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE done = 1').get().count;
  const pending = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE done = 0').get().count;

  res.json({
    total,
    completed,
    pending
  });
});

app.get('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(formatTask(task));
});

// Stage 2: insert into database
app.post('/tasks', (req, res) => {
  const { title } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must not be empty' });
  }

  const trimmedTitle = title.trim();
  const stmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const info = stmt.run(trimmedTitle, 0);

  const newTask = {
    id: Number(info.lastInsertRowid),
    title: trimmedTitle,
    done: false
  };

  res.status(201).json(newTask);
});

// Stage 3: update and delete with SQL
app.put('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!existingTask) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body || {};

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'At least title or done must be provided' });
  }

  let newTitle = existingTask.title;
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    newTitle = title.trim();
  }

  let newDone = existingTask.done;
  if (done !== undefined) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'Done must be a boolean' });
    }
    newDone = done ? 1 : 0;
  }

  const updateStmt = db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?');
  updateStmt.run(newTitle, newDone, taskId);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.json(formatTask(updatedTask));
});

app.delete('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const info = stmt.run(taskId);

  if (info.changes === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.status(204).send();
});

// Stage 5
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
