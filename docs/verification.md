# A3 verification

Verified on 2026-10-28 using Docker Desktop on Windows with WSL 2:

- Docker Engine 29.9.2 and Docker Compose 5.6.1 built and started the two-service stack with `docker compose up --build -d`.
- The database is PostgreSQL 17.11 in the `postgres:17-alpine` container. The API starts after the database healthcheck passes.
- A fresh database automatically received the tasks table and exactly three example rows.
- The containerized API returned 200/201/204/400/404 as expected during the full CRUD cycle; successful DELETE returned an empty body.
- A task was created and marked done, then the entire stack was removed with `docker compose down` and recreated with `docker compose up -d`. The same task and completion state survived in the named volume. The checkpoint task was subsequently deleted.
- All 19 integration tests passed inside the API container against a separate disposable `tasks_test` database. This includes validation, SQL injection input, filters, statistics, partial updates and repeated/concurrent initialization. See [test output](docker-tests.txt).
- A clean local Git clone, a copy of `.env.example` to `.env`, and `docker compose up --build -d` started successfully and returned exactly three seeded tasks. Its separate test containers and volume were removed afterwards, and the primary stack was restored.
- Actual psql `\dt` and SELECT output is in [postgres-output.txt](postgres-output.txt). A real query screenshot from a temporary read-only pgweb client is in [postgres.jpg](postgres.jpg). The temporary viewer was removed after capture.
- Actual `curl.exe -i` output from the Docker stack is in [error-response.txt](error-response.txt) and pasted into the README.
- Node syntax checks, a fresh `npm ci --ignore-scripts`, and `git diff --check` passed. `.env` is ignored and does not appear in Git history.

[Machine-readable Docker results](docker-verification.json) record the versions, checks and final rows. Earlier native PostgreSQL 18.4 verification is retained in `postgres-test-result.json` as historical evidence; it has now been supplemented by actual Docker verification.

The optional AI rematch was excluded at the user's request. Existing A2 `ai-version/` files were left untouched.
