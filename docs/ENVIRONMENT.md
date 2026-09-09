# Environment configuration

Three environments, never sharing secrets:

| | `NODE_ENV` | Database | Notes |
| --- | --- | --- | --- |
| Development | `development` | `goldenaura` (Docker :5434) | `server/.env`, `client/.env` — git-ignored |
| Testing | `test` | `goldenaura_test` (Docker :5434) | `server/src/tests/setup.js` sets safe defaults; no `.env` needed |
| Production | `production` | managed Postgres | injected by the host (see `render.yaml`) — nothing committed |

`server/src/config/index.js` validates the server environment at startup with
Zod and **exits** on anything missing or malformed.

## `server/.env`

Copy `server/.env.example`. Fields:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | – | `development` | `development` \| `test` \| `production` |
| `PORT` | – | `4000` | API listen port |
| `DATABASE_URL` | **yes** | – | Postgres connection string |
| `SHADOW_DATABASE_URL` | dev only | – | only used by `prisma migrate dev` |
| `JWT_ACCESS_SECRET` | **yes** (≥8) | – | signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | **yes** (≥8) | – | signs rotating refresh tokens |
| `JWT_ACCESS_TTL` | – | `1h` | access-token lifetime |
| `JWT_REFRESH_TTL` | – | `30d` | refresh-token lifetime (silent re-issue) |
| `CORS_ORIGIN` | – | `http://localhost:5173` | comma-separated allowed client origins |
| `COOKIE_DOMAIN` | – | – | set for cross-subdomain cookies in prod |
| `TRUST_PROXY` | – | `false` | `true`/`1` behind a reverse proxy |
| `STORAGE_DRIVER` | – | `local` | `local` \| `s3` |
| `UPLOAD_DIR` | – | `./uploads` | local upload root (created on boot) |
| `PUBLIC_UPLOAD_BASE_URL` | – | `http://localhost:4000/uploads` | public base for stored files |
| `S3_*` | if `s3` | – | endpoint / region / bucket / keys / public base |
| `PAYMENT_DRIVER` | – | `manual` | only `manual` — orders are settled by a human, no gateway |
| `MAIL_DRIVER` | – | `console` | `console` (logs) \| `smtp` |
| `MAIL_FROM` | – | `Swarna Prabha <no-reply@swarnaprabha.local>` | From header |
| `SMTP_*` | if `smtp` | – | host / port / user / pass |
| `SEED_ADMIN_EMAIL` … `SEED_CUSTOMER_PASSWORD` | – | `*@swarnaprabha.local` / `*12345` | used by `npm run db:seed` |

There are **no AI / LLM / model / OCR / vision variables** — the application is
deterministic and has no such dependencies.

## `client/.env`

| Key | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000` | API base URL. In dev the Vite proxy also forwards `/api`, `/uploads` and `/jewellery-images` here, so a relative-path client works with either value. |

## Secrets policy

- `.env` and `.env.*` are git-ignored; only `*.env.example` files are committed.
- Production secrets are set in the host dashboard (`sync: false` / `generateValue`
  in `render.yaml`) and never appear in the repo.
- Production responses never include stack traces or configuration values.
