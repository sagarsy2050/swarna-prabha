# Deployment

Swarna Prabha has two deployable parts:

| Part | What | Free host |
| --- | --- | --- |
| **Storefront** (`client/`) | static React build | **GitHub Pages** — automated by `.github/workflows/deploy.yml` |
| **API + database** (`server/`) | Express + PostgreSQL | **Render** free tier — blueprint in `render.yaml` |

GitHub Pages is static only, so the API cannot live there. The two are wired
together by one setting: the storefront build needs `VITE_API_URL` pointing at
the deployed API.

---

## 1. Storefront → GitHub Pages

Already wired. On every push to `main` that touches `client/`, the workflow
builds the client and publishes it.

One-time setup on the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main` (or run the workflow manually from the Actions tab).
3. The site appears at `https://<user>.github.io/<repo>/`.

The build sets `VITE_BASE=/<repo>/` automatically so asset paths and client-side
routing work under the sub-path. A `404.html` copy of `index.html` is emitted so
deep links (`/catalog/rings`) resolve.

Until step 2 below is done, the site loads but the catalogue is empty — there is
no API for it to call yet.

## 2. API + database → Render

1. Push this repo to GitHub (done — see below).
2. On Render: **New → Blueprint**, pick this repo. Render reads `render.yaml` and
   creates `swarna-prabha-db` (PostgreSQL 16) and `swarna-prabha-api`.
3. The database needs the `vector` extension. On the Render database shell:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   (The first migration also issues this; running it manually first avoids a
   permissions race on some plans.)
4. Set the API service's env vars in the dashboard (those marked `sync: false`):
   - `CORS_ORIGIN` = `https://<user>.github.io` (the Pages origin, no path)
   - `PUBLIC_UPLOAD_BASE_URL` = `https://swarna-prabha-api.onrender.com/uploads`
   - `SEED_ADMIN_PASSWORD`, `SEED_JEWELLER_PASSWORD`, `SEED_CUSTOMER_PASSWORD`
   - S3\_\* only if you switch `STORAGE_DRIVER` to `s3`
5. Deploy. `preDeployCommand` runs `prisma migrate deploy`. Then run the seed
   once from the service shell:
   ```bash
   node prisma/seed.js
   ```
6. Copy the API URL (e.g. `https://swarna-prabha-api.onrender.com`).

## 3. Connect the two

1. Repo **Settings → Secrets and variables → Actions → Variables → New variable**:
   `VITE_API_URL` = the Render API URL from step 2.6.
2. Re-run the **Deploy storefront to GitHub Pages** workflow.

The storefront now talks to the live API.

### Notes / limits of the free tiers

- Render free web services **sleep after ~15 min idle**; the first request after
  a sleep takes ~30 s to wake.
- Render free PostgreSQL is deleted after 90 days unless upgraded.
- Render free disks are ephemeral — uploaded files (local `STORAGE_DRIVER`) do
  not survive a redeploy. Use S3/R2 for anything real. The classified
  `jewellery-images/` are in the repo, so they always redeploy with the API.
- Pages serves the storefront over HTTPS from `*.github.io`; the API must also
  be HTTPS (Render provides this) or the browser blocks mixed content.

## Custom domain (optional)

Point a CNAME at `<user>.github.io`, add the domain under Settings → Pages, and
add it to the API's `CORS_ORIGIN`.
