# Setup — local development

A clean checkout to a running app.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 20 | `node -v` |
| npm | ≥ 10 | ships with Node 20 |
| Docker | any recent | for the local PostgreSQL (`pgvector/pgvector:pg16`). Or bring your own Postgres 16 with the `vector` extension available. |

The repo already contains `jewellery-images/` — the approved product-image
folders. Nothing else needs downloading.

## One command

```bash
npm run setup
```

This runs, in order:

1. `install:all` — root, `server/`, `client/` dependencies
2. `db:up` — `docker compose up -d --wait db` (waits for the container healthcheck)
3. `prisma generate` (server)
4. `db:migrate` — `prisma migrate deploy` → applies `server/prisma/migrations/`
5. `db:seed` — admin + 2 jewellers (with shops) + customer, 6 categories,
   48 products / 96 images built from the files in `jewellery-images/`

Then:

```bash
npm run dev        # API on :4000, client on :5173
```

Open <http://localhost:5173>.

## Step by step (if you prefer)

```bash
# 1. dependencies
npm run install:all

# 2. environment files — the defaults work with the Docker DB below
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. database container (pgvector/pgvector:pg16 on host port 5434)
npm run db:up

# 4. schema + demo data
npm --prefix server run prisma:generate
npm run db:migrate
npm run db:seed

# 5. run both dev servers
npm run dev
```

## Seed accounts

| Role | Email | Signs in at |
| --- | --- | --- |
| Admin | `admin@swarnaprabha.local` | `/staff/login` |
| Jeweller | `jeweller@swarnaprabha.local` | `/staff/login` |
| Jeweller | `jeweller2@swarnaprabha.local` | `/staff/login` |
| Customer | `customer@swarnaprabha.local` | `/login` |

The passwords are set by `SEED_ADMIN_PASSWORD`, `SEED_JEWELLER_PASSWORD` and
`SEED_CUSTOMER_PASSWORD` in `server/.env` — set them before running
`npm run db:seed`. `server/.env.example` ships placeholders; no real passwords
are committed.

Browsing the catalogue, searching and filtering need **no account**. A customer
account is only needed to check out or book an appointment. Jeweller and admin
accounts use the separate `/staff/login` entrance and are not self-registered.

## Everyday commands

| Command | Effect |
| --- | --- |
| `npm run dev` | API + client together (hot reload) |
| `npm run dev:api` / `npm run dev:web` | one side only |
| `npm run build` | production client bundle (`client/dist`) |
| `npm run start` | run the API in production mode |
| `npm test` | server test suite (unit always; integration needs the test DB migrated) |
| `npm run lint` | ESLint, server + client |
| `npm run db:up` / `db:down` | start / stop the Postgres container |
| `npm run db:reset` | **destroys** the DB volume, recreates, migrates, reseeds |
| `npm run db:studio` | Prisma Studio |

### Running the tests

```bash
# one-time: apply migrations to the test database
DATABASE_URL=postgresql://goldenaura:goldenaura@localhost:5434/goldenaura_test?schema=public \
  npm --prefix server exec prisma migrate deploy
npm test
```

Integration tests skip themselves (rather than fail) if the test database is
unreachable or not migrated.

## Ports

| Port | Service |
| --- | --- |
| 5173 | Vite client (dev) |
| 4000 | Express API |
| 5434 | PostgreSQL (Docker container `goldenaura-db`) |

Port 5434 is deliberate — it avoids colliding with a default local Postgres on
5432 or another project's container on 5433.

## Troubleshooting

- **`prisma generate` → `EPERM ... query_engine-windows.dll.node`** — a running
  `node` process has the engine locked. Stop `npm run dev`, then
  `rm -rf server/node_modules/.prisma/client` and re-run.
- **`db:migrate` → cannot connect** — the container isn't ready. `npm run db:up`
  uses `--wait`; if you started Docker manually, give it a few seconds or check
  `docker compose logs db`.
- **`vector` extension errors on a non-Docker Postgres** — install pgvector, or
  connect the app to the provided Docker database.
- **Catalogue shows "No jewellery available"** for every category — the seed
  didn't run, or `jewellery-images/` is empty. Run `npm run db:seed`.
