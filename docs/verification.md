# A3 verification

Completed on 2026-10-28:

- 19 integration tests passed against a real temporary PostgreSQL 18.4 server on Windows, using `pg`. This was a native test server, not a mock and not Docker.
- Three seeds remained three after repeated initialization; concurrent initialization preserved existing rows.
- Full CRUD returned 200/201/204/400/404 as expected, including an empty 204 response. Malformed JSON and SQL injection inputs were tested.
- Actual `server.js` startup was exercised separately, and `curl.exe -i` captured its 404 response in `error-response.txt` and the README.
- The native database was stopped and restarted; querying it again returned the identical rows, including an updated task. See `postgres-test-result.json`.
- Node syntax checks, a fresh `npm ci --ignore-scripts`, and `git diff --check` passed. `.env` is ignored and does not appear in the repository's existing history.

Not yet verified:

- Docker Desktop, Docker Engine, Podman and WSL were unavailable on this machine. The API image build, Compose startup, clean-clone startup and persistence through `docker compose down` / `up` therefore remain untested.
- Compose uses PostgreSQL 17; the available temporary verification binary was PostgreSQL 18.4.
- A screenshot of the containerized database still needs to be captured using the README instructions. Historical SQLite screenshots are not A3 evidence.

The six A3 commits record implementation work, not a claim that unavailable Docker checkpoints were run. The optional AI rematch was excluded at the user's request; the existing A2 `ai-version/` files were left untouched.
