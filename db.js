const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
pool.on('error', (error) => console.error('Unexpected database connection error:', error.message));

async function initialize() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy .env.example to .env.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize initialization when multiple API processes start together.
    await client.query('SELECT pg_advisory_xact_lock(731903)');
    await client.query(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT FALSE
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done)');
    await client.query(`INSERT INTO tasks (title, done)
      SELECT title, done FROM (VALUES
        ('Learn HTTP basics', TRUE), ('Build a CRUD API', FALSE), ('Test endpoints with curl', FALSE)
      ) AS seeds(title, done) WHERE NOT EXISTS (SELECT 1 FROM tasks)`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function validId(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0 && Number(id) <= 2147483647;
}

async function list({ search, done, sort, order } = {}) {
  let sql = 'SELECT * FROM tasks WHERE TRUE';
  const params = [];
  if (typeof search === 'string' && search) {
    params.push(`%${search}%`);
    sql += ` AND title ILIKE $${params.length}`;
  }
  if (['true', '1', 'false', '0'].includes(done)) {
    params.push(done === 'true' || done === '1');
    sql += ` AND done = $${params.length}`;
  }
  // SQL identifiers cannot be bound as values; only allow known columns.
  const field = ['id', 'title', 'done'].includes(sort) ? sort : 'id';
  const direction = typeof order === 'string' && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return (await pool.query(`${sql} ORDER BY ${field} ${direction}`, params)).rows;
}

async function find(id) {
  if (!validId(id)) return undefined;
  return (await pool.query('SELECT * FROM tasks WHERE id = $1', [id])).rows[0];
}

async function create(title) {
  return (await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *', [title, false])).rows[0];
}

async function update(id, { title, done }) {
  if (!validId(id)) return undefined;
  return (await pool.query(`UPDATE tasks SET title = COALESCE($1, title),
    done = COALESCE($2, done) WHERE id = $3 RETURNING *`, [title, done, id])).rows[0];
}

async function remove(id) {
  if (!validId(id)) return false;
  return (await pool.query('DELETE FROM tasks WHERE id = $1', [id])).rowCount > 0;
}

async function stats() {
  return (await pool.query(`SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE done)::int AS completed,
    COUNT(*) FILTER (WHERE NOT done)::int AS pending FROM tasks`)).rows[0];
}

module.exports = {
  initialize, list, find, create, update, remove, stats,
  health: () => pool.query('SELECT 1'), close: () => pool.end()
};
