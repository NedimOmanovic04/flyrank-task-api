const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'tasks.db');
const db = new Database(dbPath);

// Create tasks table and indexes if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
  CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
`);

// Seed three example tasks only if table is empty
const countRow = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
if (countRow.count === 0) {
  const seedTasks = [
    { title: 'Learn HTTP basics', done: 1 },
    { title: 'Build a CRUD API', done: 0 },
    { title: 'Test endpoints with curl', done: 0 }
  ];

  // Seed tasks inside an atomic transaction (all-or-nothing)
  const insertSeed = db.transaction((tasksToSeed) => {
    const insertStmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
    for (const task of tasksToSeed) {
      insertStmt.run(task.title, task.done);
    }
  });

  insertSeed(seedTasks);
}

module.exports = db;
