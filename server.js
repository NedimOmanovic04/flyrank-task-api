const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

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

// Routes handle HTTP; all SQL lives in the repository.
app.get('/tasks', asyncRoute(async (req, res) => {
  res.json(await db.list(req.query));
}));

app.get('/stats', asyncRoute(async (req, res) => {
  res.json(await db.stats());
}));

app.get('/tasks/:id', asyncRoute(async (req, res) => {
  const task = await db.find(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));

app.post('/tasks', asyncRoute(async (req, res) => {
  const { title } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required and must not be empty' });
  }
  res.status(201).json(await db.create(title.trim()));
}));

app.put('/tasks/:id', asyncRoute(async (req, res) => {
  const existing = await db.find(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { title, done } = req.body || {};
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'At least title or done must be provided' });
  }
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'Title must be a non-empty string' });
  }
  if (done !== undefined && typeof done !== 'boolean') {
    return res.status(400).json({ error: 'Done must be a boolean' });
  }
  const task = await db.update(req.params.id, { title: title?.trim(), done });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));

app.delete('/tasks/:id', asyncRoute(async (req, res) => {
  if (!await db.remove(req.params.id)) return res.status(404).json({ error: 'Task not found' });
  res.status(204).send();
}));

// Stage 5
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  console.error('Request failed:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  db.initialize().then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('Task API listening on port ' + PORT);
    });
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => server.close(() => db.close().then(() => process.exit(0))));
    }
  }).catch(async (error) => {
    console.error('Database initialization failed:', error.message);
    await db.close();
    process.exitCode = 1;
  });
}

module.exports = app;
