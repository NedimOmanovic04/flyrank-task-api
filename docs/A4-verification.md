# A4 verification — 28 October 2026

- `npm test`: all 16 auth checks pass with the real Supabase SDK and a fake HTTP transport.
- All 19 PostgreSQL regression checks pass inside the A4 Docker image against a newly created disposable database. The test database was dropped afterwards; the application database was untouched.
- `docker compose up --build -d`: successful image build and API startup with the existing PostgreSQL volume.
- Supabase `/auth/v1/settings`: HTTP 200 with email sign-in enabled, signup enabled and `mailer_autoconfirm: false`. Email confirmation remains enabled.
- A real Swagger page screenshot is saved as `docs/a4-swagger.png`; protected operations expose Bearer authorization controls.
- `.env` is git-ignored and is absent from Git history. Real keys and test credentials are excluded from screenshots and committed files.

Real-user signup, email confirmation, login, protected profile/dashboard and logout still need the confirmed test account. These checks are not inferred from the SDK transport tests above.

The optional A4 AI rematch is excluded.
