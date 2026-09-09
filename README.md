# Swarna Prabha

A deterministic, **no-LLM** jewellery marketplace: browse by category → see only
correctly-classified product images → find jewellers → book appointments → buy
online. Self-contained **React (Vite) + Node.js (Express) + PostgreSQL**.

> Rebuilt from an AI-first bespoke-design app ("Jeweller AI"). The entire AI/LLM
> layer, the local Stable-Diffusion pipeline and the ML training corpora have been
> removed. See [`docs/AUDIT.md`](docs/AUDIT.md).

```
Golden Aura/
├── client/            React 18 + Vite + Tailwind SPA
├── server/            Express + Prisma + PostgreSQL REST API
├── shared/            constants shared by both sides
├── jewellery-images/  the ONLY source of product imagery (one folder per class)
├── docs/              audit, architecture, database, API, auth, security, deploy
├── docker-compose.yml
├── render.yaml
└── package.json
```

## Prerequisites

- **Node.js ≥ 20**
- **Docker** — for local PostgreSQL (`pgvector/pgvector:pg16`). Or bring a
  PostgreSQL 16 with the `vector` extension available.

## Quick start

```bash
cp server/.env.example server/.env        # defaults work with the Docker DB
cp client/.env.example client/.env
npm run setup                             # install · db up · generate · migrate · seed
npm run dev                               # API :4000 + client :5173
```

Open <http://localhost:5173>. Full runbook: [`docs/SETUP.md`](docs/SETUP.md).

## Seed accounts

| Role | Email | Password | Sign in at |
| --- | --- | --- | --- |
| Admin | `admin@swarnaprabha.local` | `admin12345` | `/staff/login` |
| Jeweller | `jeweller@swarnaprabha.local` | `jeweller12345` | `/staff/login` |
| Customer | `customer@swarnaprabha.local` | `customer12345` | `/login` |

Browsing needs no account — a customer signs in only to check out or book an
appointment. Jeweller & admin use the separate `/staff/login` and are created by
an admin (no self-registration).

## Jewellery image integrity

`jewellery-images/<class>/` (e.g. `rings/`, `earrings/`, `necklaces/`, `bangles/`,
`bracelets/`) is the single source of truth for product photos. A product in the
`rings` category may only reference an image inside `jewellery-images/rings/`.
This is enforced **on the backend**, not just the UI. If a class folder has no
images the catalogue shows _"No jewellery available in this category."_ — never a
substitute image.

## Scripts (root)

| Command | Effect |
| --- | --- |
| `npm run install:all` | install root, server and client dependencies |
| `npm run dev` | run API + client concurrently |
| `npm run build` | build client production bundle |
| `npm run start` | start the API in production mode |
| `npm test` | server test suite |
| `npm run lint` | lint server + client |
| `npm run db:up` / `db:down` | start / stop the Docker PostgreSQL (port 5434) |
| `npm run db:migrate` / `db:seed` | apply migrations / seed |
| `npm run db:reset` | destroy the DB volume, recreate, migrate, reseed |

## Rebuild status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Audit · strip all AI · rebrand · image library · new DB | **done** |
| 2 | Prisma rebuild · catalogue · category↔folder image integrity | **done** |
| 3 | Shops · cart · checkout · orders · appointments | **done** |
| 4 | Jeweller + admin dashboards | **done** |
| 5 | Tests · CI/CD · docs · production-readiness report | pending |
| 6 | Financial document verification module (OCR, no-LLM) | pending |

## Documentation

- [`docs/SETUP.md`](docs/SETUP.md) — clean-checkout to running app
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — every env var, per environment
- [`docs/AUDIT.md`](docs/AUDIT.md) — repository audit + phase tracker
- [`docs/AUTH_ARCHITECTURE.md`](docs/AUTH_ARCHITECTURE.md)
- [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md)
- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/RENDER_DEPLOYMENT.md`](docs/RENDER_DEPLOYMENT.md)

_`ARCHITECTURE.md`, `DATABASE.md`, `TESTING.md`, `DEPLOYMENT.md` are written in Phase 5._
