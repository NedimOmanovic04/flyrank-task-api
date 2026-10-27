const express = require('express');

const app = express();
const PORT = 3000;

let tasks = [
  { id: 1, title: 'Learn HTTP basics', done: true },
  { id: 2, title: 'Build a CRUD API', done: false },
  { id: 3, title: 'Test endpoints with curl', done: false }
];

// Stage 1
app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Stage 2
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(task);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
