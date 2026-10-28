# A4 verification — 28 October 2026

- `npm test`: all 16 auth checks pass with the real Supabase SDK and a fake HTTP transport.
- All 19 PostgreSQL regression checks pass inside the A4 Docker image against a newly created disposable database. The test database was dropped afterwards; the application database was untouched.
- `docker compose up --build -d`: successful image build and API startup with the existing PostgreSQL volume.
- Supabase `/auth/v1/settings`: HTTP 200 with email sign-in enabled, signup enabled and `mailer_autoconfirm: false`. Email confirmation remains enabled.
- A real Swagger page screenshot is saved as `docs/a4-swagger.png`; protected operations expose Bearer authorization controls.
- `.env` is git-ignored and is absent from Git history. Real keys and test credentials are excluded from screenshots and committed files.

## Real Supabase verification

The test account was registered through `POST /auth/signup` (201). The user clicked the email confirmation link, and email confirmation remained enabled throughout.

`npm run test:live` passed against the running Docker API and the real Supabase project:

| Check | HTTP status |
| --- | --- |
| Public info without a token | 200 |
| Signup/login missing required fields | 400 |
| Login with wrong password | 401 |
| Login with confirmed account | 200 |
| Profile/dashboard with no token | 401 |
| Profile/dashboard with a modified JWT signature | 401 |
| Profile/dashboard with the valid token | 200 |
| Logout with no token or a modified JWT | 401 |
| Logout with the valid token | 204, empty body |

The login → profile → dashboard → tampered-token rejection → logout flow also passed using actual `curl.exe -sS -i` requests. Responses and credentials were held in memory; tokens and passwords were not printed.

The real Swagger UI flow passed separately: **Try it out** on login returned 200 and session tokens; **Authorize** with the access token allowed profile to return 200; logout returned 204. Swagger authorization was removed and the page reloaded to clear request credentials and responses before the final screenshot. The screenshot shows the routes without exposing test email, password or tokens.

The optional A4 AI rematch is excluded.
