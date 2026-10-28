# Task API — A3: Postgres + Docker Compose

Node.js, Express and `pg`. The SQLite storage from A2 has been replaced by a Postgres server. SQL stays in `db.js`; routes keep the existing JSON task shape (`id`, `title`, boolean `done`) and validation. Existing search, filter, sorting, statistics and Swagger routes are retained.

## Run the whole stack

Install and start Docker Desktop with Linux containers and Docker Compose v2. No local Node.js or Postgres installation is needed.

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Bash:

```bash
cp .env.example .env && docker compose up --build
```

After the initial build, `docker compose up` starts everything. Open [tasks](http://localhost:3000/tasks), [Swagger UI](http://localhost:3000/docs), or [health](http://localhost:3000/health).

`.env.example` provides runnable local placeholders. In `.env`, replace the password in both `POSTGRES_PASSWORD` and `DATABASE_URL` with the same local password. `POSTGRES_USER` and `POSTGRES_DB` must also match the URL. Use a URL-safe password, or percent-encode it in the URL. `.env` is ignored by Git and excluded from the Docker build.

Inside Compose, `DATABASE_URL` uses `db:5432`, the database service name. Only the API port (3000) is published. The API waits for the database healthcheck and creates its schema before accepting requests. The database uses `postgres:17-alpine`; its named volume is mounted at `/var/lib/postgresql/data`.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/tasks` | 200, array of tasks |
| GET | `/tasks/:id` | 200, task; 404 if missing |
| POST | `/tasks` | 201, created task; 400 for missing/blank title |
| PUT | `/tasks/:id` | 200, updated task; 400 for invalid body; 404 if missing |
| DELETE | `/tasks/:id` | 204, empty body; 404 if missing |
| GET | `/stats` | 200, total/completed/pending counts |
| GET | `/health` | 200, `{ "status": "ok" }` (process liveness) |
| GET | `/docs` | Swagger UI |
| GET | `/` | API metadata |

POST accepts `{ "title": "Read Docker docs" }` and starts `done` at false, as in A2. PUT accepts either or both of `title` (nonblank string) and `done` (boolean). Unknown task IDs return `{ "error": "Task not found" }`. Malformed JSON returns 400 with a JSON error. Task IDs must be positive PostgreSQL integer IDs.

List options: `?search=curl`, `?done=true` (also false/1/0), and `?sort=title&order=desc`. Search is case-insensitive. Sort fields are allowlisted (`id`, `title`, `done`), and query values use `$1`, `$2`, etc. parameters.

## Schema and initialization

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
```

Initialization runs in a transaction, protected by a Postgres advisory lock so simultaneous API startups do not duplicate seeds. Three tasks are inserted only when the table is empty: Learn HTTP basics (done), Build a CRUD API, and Test endpoints with curl. Restarting with existing tasks preserves them. If all tasks are deleted, the next API startup reseeds the empty table, following the assignment's empty-table rule.

## Inspect the database and capture submission evidence

```powershell
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Inside psql:

```text
\dt
SELECT * FROM tasks ORDER BY id;
\q
```

Verified containerized Postgres data is shown below. The screenshot was captured in a temporary read-only pgweb client connected to the Compose database; the normal stack still contains just API and database. The actual psql table listing and SELECT output are also saved in [docs/postgres-output.txt](docs/postgres-output.txt).

![Tasks stored in containerized PostgreSQL](docs/postgres.jpg)

Existing screenshots in the repository root are historical A1/A2 evidence.

## CRUD and persistence checkpoint

In PowerShell, use `curl.exe` to avoid the Windows PowerShell alias. In Bash, use `curl`.

```powershell
curl.exe -i http://localhost:3000/tasks
'{"title":"Persistence checkpoint"}' | Set-Content -Encoding ascii task-payload.json
curl.exe -i -X POST http://localhost:3000/tasks -H 'Content-Type: application/json' --data-binary '@task-payload.json'
```

Use the returned ID in place of `4` below (IDs are not reused):

```powershell
'{"done":true}' | Set-Content -Encoding ascii task-payload.json
curl.exe -i -X PUT http://localhost:3000/tasks/4 -H 'Content-Type: application/json' --data-binary '@task-payload.json'
docker compose down
docker compose up -d
curl.exe -i http://localhost:3000/tasks/4
curl.exe -i -X DELETE http://localhost:3000/tasks/4
curl.exe -i http://localhost:3000/tasks/4
```

Wait for the API to start before sending requests after `up`. Expect 201, 200, 200 after restart, 204 with no body, and then 404. The named `taskdata` volume survives `docker compose down`. `docker compose down --volumes` deletes the database and starts fresh on the next run.

Changing `.env` credentials after creating the volume does not change existing Postgres roles. Keep the existing credentials or explicitly reset a disposable volume.

## Local Node development and tests

Use Node.js 24+. To run Node outside Docker, publish the database to loopback temporarily with a Compose override (the normal stack does not expose it):

```yaml
# compose.local.yaml (optional)
services:
  db:
    ports: ["127.0.0.1:5432:5432"]
```

```powershell
docker compose -f compose.yaml -f compose.local.yaml up -d db
npm.cmd ci
```

For `npm start`, set `DATABASE_URL` in the shell to the same URL with `localhost` instead of `db`. The start command also reads `.env`; an existing shell variable takes precedence.

The integration suite resets the tasks table. Use a separate disposable database named `tasks_test`, never your application database:

```powershell
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" tasks_test'
$env:TEST_DATABASE_URL = 'postgres://postgres:YOUR_URL_ENCODED_PASSWORD@localhost:5432/tasks_test'
npm.cmd test
```

Tests cover CRUD, validation, boolean values, malformed JSON, SQL injection inputs, filters, stats, partial updates and repeated/concurrent initialization. Missing `TEST_DATABASE_URL` fails before touching any database.

## Verification status

Docker build, CRUD, volume persistence through `down` / `up`, all 19 integration tests inside Docker, and startup from a clean Git clone have passed. See [verification notes](docs/verification.md) and [recorded results](docs/docker-verification.json). The optional A3 AI rematch is excluded.

## References

- [node-postgres parameterized queries](https://node-postgres.com/features/queries)
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)

## Captured error response

Actual `curl.exe -sS -i http://localhost:3000/tasks/999` output from the Docker Compose stack:

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 26
ETag: W/"1a-D4dsL3U5Autp3bKNpxD/le70vNM"
Date: Wed, 28 Oct 2026 20:47:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Task not found"}
```
