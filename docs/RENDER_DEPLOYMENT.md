# RENDER_DEPLOYMENT.md

Deploying Jeweller AI to Render as **two services + one PostgreSQL**. Nothing
here has been executed — it is the runbook. Get local dev + local production
mode working first (`npm run build && npm start`).

## Topology

| Render resource | From | Serves |
| --- | --- | --- |
| `jeweller-ai-db` (PostgreSQL) | `render.yaml` `databases:` | `DATABASE_URL` to the API |
| `jeweller-ai-api` (Node web service) | `render.yaml`, `rootDir: server` | the REST API at `/api/*` |
| `jeweller-ai-web` (Static site) | `render.yaml`, `rootDir: client` | the built SPA |

## 1. Render service setup

Option A — **Blueprint**: New → *Blueprint* → point at this repo. Render reads
`render.yaml` and creates all three. `autoDeploy: false` is set, so nothing ships
until you click Deploy.

Option B — **manual**: create the PostgreSQL, then the two web services with the
commands from §4–§6, then set env vars from §2.

## 2. Environment variables

### `jeweller-ai-api`

| Var | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` (required — Secure cookies + real client IPs behind Render's proxy) |
| `DATABASE_URL` | from `jeweller-ai-db` (auto-wired by the blueprint) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `generateValue` (blueprint) or paste long random strings |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | `15m`, `30d` |
| `CORS_ORIGIN` | the **exact** web URL, e.g. `https://jeweller-ai-web.onrender.com` (comma-separate if several) |
| `AI_DRIVER` | `noop` (there is no Ollama on Render). To enable AI, host Ollama somewhere reachable and set `AI_DRIVER=ollama` + `OLLAMA_BASE_URL=https://<your-ollama-host>`. |
| `PAYMENT_DRIVER` | `manual` |
| `MAIL_DRIVER` | `console`, or `smtp` + `SMTP_HOST/PORT/USER/PASS` + `MAIL_FROM` |
| `STORAGE_DRIVER` | `local` for a quick start; **`s3` for anything real** — Render's free/instance disks are ephemeral and wiped on deploy/restart. Set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` (S3 / Cloudflare R2 / Backblaze B2). |
| `PUBLIC_UPLOAD_BASE_URL` | only for `local`: `https://jeweller-ai-api.onrender.com/uploads` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | if you want to run the seed once post-deploy |

### `jeweller-ai-web`

| Var | Value |
| --- | --- |
| `VITE_API_URL` | the API URL, e.g. `https://jeweller-ai-api.onrender.com` (baked in at build time) |

> **Chicken-and-egg:** the API needs `CORS_ORIGIN` = the web URL, and the web
> build needs `VITE_API_URL` = the API URL. Create both services first (URLs are
> assigned on creation), then set the two vars and trigger a deploy of each.

## 3. Database setup

The blueprint provisions `jeweller-ai-db`. Migrations run automatically via the
API service's **pre-deploy** command:

```
npx prisma migrate deploy
```

To create the first admin account, run the seed once from the API service's
Render **Shell** (after setting `SEED_ADMIN_*`):

```
node prisma/seed.js
```

(The seed is upsert-based and safe to re-run.)

## 4. Build command

- API: `npm ci && npx prisma generate`
- Web: `npm ci && npm run build`

## 5. Start command

- API: `node src/server.js` — binds `0.0.0.0:$PORT` (`config.port` reads
  `process.env.PORT`; Render sets it).
- Web: static — Render serves `client/dist/` with the SPA rewrite from `render.yaml`.

## 6. Migration command

Pre-deploy on the API service: `npx prisma migrate deploy`. It only applies
committed migrations in `server/prisma/migrations/` and never prompts. If a
deploy fails here, the release is not promoted — fix the migration and redeploy.

## 7. Frontend deployment (separate)

`jeweller-ai-web` is a Render **Static Site**. `staticPublishPath: dist`, SPA
rewrite `/* → /index.html`, long-cache headers on `/assets/*`. Rebuild whenever
`VITE_API_URL` changes (it is inlined at build time).

## 8. Backend deployment

`jeweller-ai-api` is a Render **Web Service** (Node). Health check path
`/api/health` — Render waits for `200` before routing traffic. `/api/health`
returns `503` when the DB is unreachable, so a bad `DATABASE_URL` fails the
deploy visibly.

## 9. Domain configuration

Add a custom domain to `jeweller-ai-web` in Render → Settings → Custom Domains,
create the CNAME it shows. Then update the API's `CORS_ORIGIN` to the custom
domain (or add it to the comma-separated list) and redeploy the API. Update
`VITE_API_URL` only if you also put the API on a custom domain.

## 10. Production verification

```bash
curl -s https://jeweller-ai-api.onrender.com/api/health | jq
#   { "status": "ok", "checks": { "database": { "ok": true }, ... } }

# open the web URL, register a customer, log in, browse /catalog
# log in as the seeded admin, open /admin, promote a user to JEWELLER
```

Checklist:
- [ ] `/api/health` → `200` with `database.ok = true`
- [ ] Web app loads, no console errors, `VITE_API_URL` requests succeed (no CORS errors)
- [ ] Register + login round-trip works; refresh cookie is `Secure; SameSite=None`
- [ ] A protected route 401s when logged out and works when logged in
- [ ] Static assets are cached; SPA deep links (`/my-orders/abc`) resolve

## 11. Common deployment errors

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deploy fails at pre-deploy | `DATABASE_URL` wrong / DB not ready | check the DB is `available`; re-wire the env var |
| App boots then exits | `config/index.js` validation failed | read the logs — it prints exactly which env var is missing/short (`JWT_*` need ≥ 8 chars) |
| Browser: CORS error | `CORS_ORIGIN` ≠ the actual web origin | set it to the exact `https://…` origin, redeploy the API |
| Login works, refresh 401s on reload | `TRUST_PROXY` unset → `Secure` cookie dropped | set `TRUST_PROXY=1` |
| Uploaded images 404 after a deploy | `STORAGE_DRIVER=local` on ephemeral disk | switch to `s3` + bucket creds |
| AI endpoints always 503 | no Ollama on Render (expected with `AI_DRIVER=noop`) | host Ollama and set `AI_DRIVER=ollama` + `OLLAMA_BASE_URL`, or leave disabled |
| `prisma generate` missing at runtime | build command omitted it | build must be `npm ci && npx prisma generate` |
| 502 on first request after idle | free instance cold start | expected on the free plan; upgrade for always-on |
