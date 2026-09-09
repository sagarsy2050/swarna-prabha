# Deployment

Two hosts:

| Part | Host | Automation |
|---|---|---|
| **API + PostgreSQL** (`server/`) | **Render** free tier | `render.yaml` blueprint — one click + 4 values |
| **Storefront** (`client/`) | **GitHub Pages** | `.github/workflows/deploy.yml` — runs on every push to `main` |

GitHub Pages is static-only, so the API lives on Render. They are wired together
by one setting — the API URL the storefront build targets.

---

## 1. API + database → Render (install-ready)

1. **Render dashboard → New → Blueprint → select this repo.**
2. Render reads `render.yaml` and creates:
   - `swarna-prabha-db` — PostgreSQL 16
   - `swarna-prabha-api` — the Express API at
     `https://swarna-prabha-api.onrender.com`
   - `swarna-prabha-web` — an optional static copy of the storefront
3. Render prompts you **once** for the 3 `sync: false` values:
   | Variable | Enter |
   |---|---|
   | `SEED_ADMIN_PASSWORD` | a password for `admin@swarnaprabha.local` |
   | `SEED_JEWELLER_PASSWORD` | a password for `jeweller@` / `jeweller2@swarnaprabha.local` |
   | `SEED_CUSTOMER_PASSWORD` | a password for `customer@swarnaprabha.local` |

   (`CORS_ORIGIN` is fixed to `https://sagarsy2050.github.io`; edit it in the
   dashboard afterwards if you add a custom domain.)
4. Click **Apply**. Everything else is automatic:
   - **build:** `npm ci && npx prisma generate`
   - **start:** `npx prisma migrate deploy` — this also runs
     `CREATE EXTENSION IF NOT EXISTS "vector"` (pgvector is on Render's allowed
     list) — then `node prisma/seed.js` (best-effort; idempotent: 4 users,
     6 categories, 96 products), then `node src/server.js`.
     The free tier has no pre-deploy hook, so migrate + seed run at start; both
     are idempotent, so every restart is safe.
   - **health check:** `/api/health`

No manual SQL, no manual seed.

**Sign in after deploy:** the seed emails are fixed
(`admin@` / `jeweller@` / `jeweller2@` / `customer@swarnaprabha.local`); the
passwords are the ones you typed in step 3. Admin/jeweller → `/staff/login`,
customer → `/login`.

## 2. Storefront → GitHub Pages

Already automated. One-time repo setting: **Settings → Pages → Source: GitHub
Actions** (done). The workflow:

- builds with `VITE_BASE=/swarna-prabha/` so asset & route paths work under the
  sub-path,
- sets `VITE_API_URL` to the repo variable `VITE_API_URL` if present, otherwise
  falls back to `https://swarna-prabha-api.onrender.com` (the Render service
  above),
- copies `index.html` → `404.html` so deep links resolve,
- publishes to <https://sagarsy2050.github.io/swarna-prabha/>.

So after step 1, just **re-run the "Deploy storefront to GitHub Pages" workflow**
(Actions tab → Run workflow) and the live site talks to the live API.

If your Render API has a different URL, set a repo **Variable**
(`Settings → Secrets and variables → Actions → Variables`) named `VITE_API_URL`
and re-run the workflow.

## Free-tier caveats

- Render free web services **sleep after ~15 min idle**; first request after a
  sleep takes ~30 s.
- Render free PostgreSQL is deleted after 90 days unless upgraded.
- Render disks are ephemeral — user uploads (`STORAGE_DRIVER=local`) do not
  survive a redeploy. Set `STORAGE_DRIVER=s3` + the `S3_*` vars for real files.
  The classified `jewellery-images/` ship in the repo, so they always redeploy.
- Pages serves over HTTPS from `*.github.io`; the API must also be HTTPS (Render
  provides this) or the browser blocks mixed content.

## Local development

See [`docs/SETUP.md`](SETUP.md). Locally the client uses the Vite dev proxy
(`VITE_API_URL` empty), so there is never a CORS or wrong-URL problem —
everything is same-origin on `http://localhost:5173`.
