# Swarna Prabha

A **deterministic, no-LLM jewellery marketplace**. Customers browse a
category-classified catalogue, see only correctly-classified product images,
discover jeweller shops, book appointments, and buy online. No AI, no chatbot,
no image generation — every result comes from the database or the filesystem.

**Repo:** <https://github.com/sagarsy2050/swarna-prabha> ·
**Storefront (GitHub Pages):** <https://sagarsy2050.github.io/swarna-prabha/>
(frontend only — needs a deployed API to show data, see [Deployment](#deployment))

> Rebuilt from an AI-first bespoke-design app. The entire LLM layer, a local
> Stable-Diffusion pipeline and ~19 GB of ML corpora were removed — see
> [`docs/AUDIT.md`](docs/AUDIT.md).

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Data model](#data-model)
- [Jewellery image integrity](#jewellery-image-integrity)
- [Authentication & roles](#authentication--roles)
- [API reference](#api-reference)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Testing & the workflow audit](#testing--the-workflow-audit)
- [Deployment](#deployment)
- [Rebuild status](#rebuild-status)
- [Documentation](#documentation)

---

## What it does

### Customer (no account needed to browse)

- Browse the catalogue by **category** (Rings, Earrings, Necklaces, Bangles,
  Bracelets, Bridal Jewellery).
- Filter deterministically by **metal, purity, stone, price range, weight range,
  availability, shop**, plus free-text search. Filter options come from real
  distinct values in the data (`/api/products/facets`).
- View a **product page** — image gallery, metal / purity / weight / stone,
  stock status, the shop that sells it.
- **Discover shops** (`/shops`) — verified badge, location, opening hours,
  contact, the pieces they stock.
- **Sign in only to**: add to cart, check out, or book an appointment.
- **Cart & checkout** — server-authoritative cart; checkout is one transaction
  that re-checks & decrements stock, splits the cart into **one order per
  jeweller**, records a `PENDING` payment, and clears the cart.
- **Orders** — `/my-orders` with a live status stepper
  (`PENDING → CONFIRMED → PROCESSING → READY → SHIPPED → DELIVERED`, or
  `CANCELLED`).
- **Appointments** — real per-shop slot availability, book / view / cancel;
  double-booking is impossible (DB partial-unique index + a friendly `409`).

### Jeweller (`/staff/login`)

Tabbed dashboard: **Overview** KPIs · **Products** (create/edit/delete, with an
image picker restricted to the category's folder) · **Inventory** (quick qty
adjust, low-stock flag) · **Appointments** (accept / reject / complete) ·
**Orders** (advance status along the flow) · **Shop profile** (`PATCH
/api/shops/me`).

### Admin (`/staff/login`)

**Overview** · **Users** (role, active toggle, create) · **Shops** (verify /
hide) · **Categories** (create with folder mapping, hide) · **Products** (all,
delete) · **Orders** (all) · **Appointments** (all).

---

## Tech stack

| Layer | Choice |
|---|---|
| Client | React 18, Vite 6, React Router 6, Tailwind, TanStack Query, Radix UI |
| API | Node ≥ 20, Express 4, Prisma 6 |
| Database | PostgreSQL 16 (`pgvector/pgvector:pg16` image; the `vector` extension is enabled but unused) |
| Auth | JWT access (short-lived, silent refresh) + rotating refresh token (httpOnly cookie), bcrypt |
| Storage | local disk or S3-compatible (`STORAGE_DRIVER`) |
| Payments | `manual` only — no gateway, no fabricated success |
| Mail | `console` or SMTP |
| Tests | Vitest + Supertest |

No AI/LLM/ML runtime dependency anywhere.

---

## Architecture

```
                         Browser (React SPA)
                                │
        dev: Vite proxy  ───────┼───────  prod: VITE_API_URL
                                │
                     Express API  (:4000)
        ┌───────────────────────┼────────────────────────┐
     controllers            middleware                services
   auth product shop     authenticate / optionalAuth   auth product category
   category order        requireRole / roleGuard       image shop appointment
   appointment           validate (zod)                order (cart+checkout)
                                │
                          Prisma Client
                                │
                    PostgreSQL  (goldenaura, :5434)

  Static:  /uploads            → server/uploads/          (local storage driver)
           /jewellery-images   → <repo>/jewellery-images/ (approved product photos)
```

- **Composable services** — a generic `createCrudService` factory
  (`server/src/services/crudService.js`) plus domain services that add rules.
- **`image.service.js`** is the single place category↔folder image integrity is
  enforced.
- **`order.service.js`** owns the cart and the transactional checkout.
- Every write route is guarded by `authenticate` + `requireRole`; ownership is
  re-checked in the service (a jeweller can only touch their own
  products/orders/appointments).

---

## Repository layout

```
Golden Aura/
├── client/
│   └── src/
│       ├── api/            client.js · auth (in client) · products · shops · appointments · orders
│       ├── components/     layout (Navbar, Layout, ProtectedRoute…) · jewellery/* · dashboard/Shell · ui/*
│       ├── lib/            AuthContext · CartContext · query-client · utils (assetUrl, formatMoney…)
│       ├── pages/          Home · JewelleryCatalog · JewelleryDetail · Shops · ShopDetail
│       │                   Cart · Checkout · MyOrders · OrderDetail · Appointments · BookAppointment
│       │                   Profile · JewellerDashboard · AdminDashboard · Login · StaffLogin · …
│       ├── App.jsx  main.jsx  index.css
│       └── vite.config.js  (base path + dev proxy for /api, /uploads, /jewellery-images)
│
├── server/
│   ├── prisma/            schema.prisma · seed.js · migrations/ (2: init, appointment_active_slot_unique)
│   ├── scripts/           workflow-audit.mjs   (npm run audit)
│   └── src/
│       ├── config/index.js       zod-validated env (no AI vars)
│       ├── controllers/          auth · product · category · shop · order · (rest generic)
│       ├── middleware/           auth · roleGuard · validate · schemas (zod) · error
│       ├── routes/               health auth users categories products shops cart orders appointments inventory files
│       ├── services/             auth user product category image shop order(cart+checkout) appointment health file
│       ├── integrations/         payment (manual) · storage (local/s3) · mail (console/smtp)
│       ├── utils/                ApiError · pagination · serialize · jwt · password
│       └── tests/                unit (jwt, password, pagination) + integration (auth)
│
├── shared/constants.js            roles + enum lists mirrored from Prisma
├── jewellery-images/              rings/ earrings/ necklaces/ bangles/ bracelets/ bridal/
│                                   — the ONLY approved product-image source
├── docs/                          AUDIT · WORKFLOW_AUDIT · SETUP · ENVIRONMENT · DEPLOYMENT · AUTH · DATABASE · API · SECURITY
├── .github/workflows/deploy.yml   build client → GitHub Pages
├── docker-compose.yml             pgvector/pgvector:pg16 on host :5434 + optional MinIO
├── docker/initdb/                 creates goldenaura_shadow / goldenaura_test + the vector extension
├── render.yaml                    API + PostgreSQL blueprint (free tier)
└── package.json                   workspace scripts
```

---

## Data model

Prisma models (`server/prisma/schema.prisma`):

| Group | Models |
|---|---|
| Identity | `User`, `CustomerProfile`, `JewellerProfile` *(= the shop)*, `RefreshToken`, `PasswordResetToken` |
| Catalogue | `JewelleryCategory` (`code`, `slug`, **`folder`**), `Product`, `ProductImage` (`folder` + `path`, validated) |
| Commerce | `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment` |
| Appointments | `Appointment` — partial unique index on `(jewellerId, date, timeSlot) WHERE status IN ('PENDING','CONFIRMED')` |
| Ops | `InventoryItem`, `FileObject` |

Enums: `Role`, `ProductAvailability`, `OrderStatus`, `PaymentStatus`,
`AppointmentServiceType`, `AppointmentStatus`.
Currency is **INR** throughout.

`JewellerProfile` *is* the shop — there is no separate `Shop` entity, so
`shopId == jewellerId` everywhere.

---

## Jewellery image integrity

`jewellery-images/<class>/` (`rings/`, `earrings/`, `necklaces/`, `bangles/`,
`bracelets/`, `bridal/`) is the **single source of truth** for product photos.

- Each `JewelleryCategory` has a `folder`. A product in that category may only
  reference an image whose file lives in `jewellery-images/<folder>/`.
- Enforced **on the backend** — `server/src/services/image.service.js`
  `buildProductImages()` runs on every product create/update and rejects a
  cross-folder or non-existent filename with `422 IMAGE_CATEGORY_MISMATCH`.
- The jeweller/admin image picker only offers files from the category's folder
  (`GET /api/categories/:id/images`).
- If a folder has no images, the catalogue shows
  *"No jewellery available in this category."* — **never** a substitute image
  from another product or category.

Served read-only at `/jewellery-images/<folder>/<file>` (long cache,
cross-origin resource policy set).

---

## Authentication & roles

Two **separate** sign-ins:

| Route | For | Registration |
|---|---|---|
| `/login` | Customers — needed only to check out or book | open (`/register`) |
| `/staff/login` | Jewellers & Admins | **none** — an admin provisions the account |

- Public: browse, search, filter, product pages, shop discovery, slot
  availability. `optionalAuth` is used so a logged-in user is recognised but a
  guest is never blocked.
- `authenticate` + `requireRole(...)` gate every write; the client mirrors this
  with `ProtectedRoute` (`loginPath="/staff/login"` for staff areas).
- Access token: short-lived, auto-refreshed silently. Refresh token: rotated,
  revocable, httpOnly cookie.

`npm run db:seed` creates one admin, two jewellers (each with a shop) and one
customer. Their emails default to `admin@swarnaprabha.local`,
`jeweller@swarnaprabha.local`, `jeweller2@swarnaprabha.local`,
`customer@swarnaprabha.local`; their passwords come **only** from
`SEED_ADMIN_PASSWORD` / `SEED_JEWELLER_PASSWORD` / `SEED_CUSTOMER_PASSWORD` in
`server/.env` (`server/.env.example` ships `change-me` placeholders — **no real
password is committed**). Admin and jeweller sign in at `/staff/login`; the
customer at `/login`.

---

## API reference

Base path `/api`. All responses are JSON. Errors are `{ "error": { "message", "code", "details"? } }`.
List endpoints return `{ "data": [...], "meta": { page, pageSize, total, totalPages } }`.

### Auth — `/api/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | – | create a CUSTOMER account |
| POST | `/login` | – | email + password → access token (+ refresh cookie) |
| POST | `/logout` | – | revoke the refresh token |
| POST | `/refresh` | cookie | new access token |
| GET | `/me` | token | current user + profile |
| PATCH | `/me` | token | update name / phone / customer address |
| POST | `/change-password` | token | |
| POST | `/forgot-password` · `/reset-password` | – | reset flow |

### Categories — `/api/categories`
| GET | `/` | public | list (with `productCount`, `imageCount`); `?all=1` for admins includes inactive |
| GET | `/:id` | public | one category (id / slug / code) |
| GET | `/:id/images` | JEWELLER/ADMIN | approved image filenames for the folder |
| POST · PATCH · DELETE | `/` · `/:id` | ADMIN | manage categories |

### Products — `/api/products`
| GET | `/` | public | filters: `category, shop, metal, purity, stone, availability, priceMin, priceMax, weightMin, weightMax, q, page, pageSize, sort`; staff `?all=1` includes drafts, `?mine=true` scopes to own |
| GET | `/facets` | public | distinct metal/purity/stone + price/weight range for the current category |
| GET | `/:id` | public | full product (drafts visible only to the owner/admin) |
| POST · PATCH · DELETE | `/` · `/:id` | JEWELLER (own) / ADMIN | image list validated against the category folder |

### Shops — `/api/shops`
| GET | `/` | public | discovery list (`?all=1` admin) |
| GET | `/:slug` | public | shop profile + products + opening hours |
| GET · PATCH | `/me` | JEWELLER/ADMIN | own shop |
| PATCH | `/:id` | ADMIN | any shop (incl. `verified`) |

### Cart — `/api/cart` *(CUSTOMER)*
| GET | `/` | current cart with line totals, stock & price-change flags |
| POST | `/items` | `{ productId, quantity }` |
| PATCH | `/items/:productId` | `{ quantity }` (0 removes) |
| DELETE | `/` | clear |

### Orders — `/api/orders`
| POST | `/` | CUSTOMER | checkout: `{ contactName, contactPhone, shippingAddress }` → one order per jeweller |
| GET | `/` · `/:id` | token | scoped (customer → own, jeweller → shop's, admin → all) |
| PATCH | `/:id/status` | JEWELLER (own) / ADMIN | `{ status }` — validated transition; `CANCELLED` restocks; `CONFIRMED` marks the payment `PAID` |

### Appointments — `/api/appointments`
| GET | `/availability?jewellerId=&date=` | public | slots for a shop on a date |
| GET | `/` · `/:id` | token | scoped |
| POST | `/` | token | `{ jewellerId, date, timeSlot, serviceType?, productId?, customerName, customerPhone, notes? }` → `PENDING`; double-book → `409 SLOT_TAKEN` |
| PATCH | `/:id` | token | customer may only `CANCELLED` + notes; jeweller/admin: `CONFIRMED / REJECTED / COMPLETED`, reschedule |
| DELETE | `/:id` | token | soft-cancel |

### Others
- `/api/users` — ADMIN: list, get, create, `PATCH /:id/role`, `PATCH /:id/active`
- `/api/inventory` — JEWELLER/ADMIN owner-scoped CRUD
- `/api/files` — authenticated upload / delete (multer, size-limited)
- `/api/health` — shallow; `?deep=1` also pings the DB. No internals leaked.

---

## Quick start

**Prerequisites:** Node ≥ 20, Docker (for local PostgreSQL, or bring a
PostgreSQL 16 with the `vector` extension).

```bash
cp server/.env.example server/.env      # defaults work with the Docker DB
cp client/.env.example client/.env      # VITE_API_URL stays empty in dev (uses the Vite proxy)
npm run setup                           # install · db up (--wait) · prisma generate · migrate · seed
npm run dev                             # API :4000 + client :5173
```

Open <http://localhost:5173>. Full runbook & troubleshooting:
[`docs/SETUP.md`](docs/SETUP.md).

> Windows note: stop `npm run dev` before `prisma generate` — a running server
> locks the query-engine DLL.

---

## Scripts

Root:

| Command | Effect |
|---|---|
| `npm run setup` | install → `db:up` → generate → migrate → seed |
| `npm run dev` / `dev:api` / `dev:web` | run both / one side |
| `npm run build` | production client bundle (`client/dist`) |
| `npm run start` | API in production mode |
| `npm test` | server test suite |
| `npm run lint` | ESLint, server + client |
| `npm run db:up` / `db:down` | start / stop the Docker PostgreSQL (:5434) |
| `npm run db:migrate` / `db:seed` | apply migrations / seed |
| `npm run db:reset` | **destroy** the DB volume, recreate, migrate, reseed |
| `npm run db:studio` | Prisma Studio |

Server: `npm --prefix server run audit` → runs `scripts/workflow-audit.mjs`
against the running API.

---

## Environment variables

Full table with types & defaults: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).
Highlights:

**`server/.env`** — `DATABASE_URL` (required), `JWT_ACCESS_SECRET` /
`JWT_REFRESH_SECRET` (required, ≥ 8 chars), `CORS_ORIGIN`
(`http://localhost:5173,http://127.0.0.1:5173`), `STORAGE_DRIVER` (`local|s3`),
`PAYMENT_DRIVER` (`manual` only), `MAIL_DRIVER` (`console|smtp`), `SEED_*`.
**There are no AI / LLM / model / OCR variables.**

**`client/.env`** — `VITE_API_URL`. **Leave empty in development** so the client
uses relative paths through the Vite proxy (same-origin, no CORS). Set it to the
API's public URL for a static production build.

---

## Testing & the workflow audit

```bash
# unit + integration (integration needs the test DB migrated once)
DATABASE_URL=postgresql://goldenaura:goldenaura@localhost:5434/goldenaura_test?schema=public \
  npm --prefix server exec prisma migrate deploy
npm test                              # 20/20

# end-to-end workflow audit against the running API
npm run dev
npm --prefix server run audit         # 57/57 — see docs/WORKFLOW_AUDIT.md
```

The audit covers auth, catalogue, **classification integrity (incl. cross-folder
image rejection)**, shops, cart, transactional checkout + stock, order status
flow + restock-on-cancel, appointments (+ double-book `409`, past-date reject,
customer-cannot-confirm), RBAC across all three roles, and admin dashboard data.

---

## Deployment

### GitHub Pages — read-only demo (no backend needed)

`.github/workflows/deploy.yml` runs on every push to `main`. In CI it spins up
Postgres, runs the real **migrate + seed**, exports the whole catalogue to
`client/public/data/catalog.json`, then builds the SPA in **static mode**
(`VITE_STATIC=true`) so it reads that file instead of calling an API;
`jewellery-images/` is copied into the site.

**Works on the demo:** browsing, categories, filters, search, product pages,
shop pages.
**Needs the backend (shows a "run locally" notice):** accounts, cart, checkout,
appointments, the jeweller/admin dashboards.

One-time: repo **Settings → Pages → Source: GitHub Actions**. Site:
<https://sagarsy2050.github.io/swarna-prabha/>.

### Full app (optional) — Render

`render.yaml` is a blueprint for the complete stack (API + PostgreSQL) on
Render's free tier: **New → Blueprint → this repo**, enter three seed passwords,
Apply. It builds, runs `prisma migrate deploy` (which creates the `vector`
extension) + `prisma/seed.js` at start, and serves the API at
`https://swarna-prabha-api.onrender.com`. Full walkthrough:
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

_Free-tier caveats: Render web services sleep after ~15 min idle (~30 s cold
start); free PostgreSQL is deleted after 90 days; the upload disk is ephemeral._

---

## Rebuild status

| Phase | Scope | State |
|---|---|---|
| 1 | Audit · strip all AI · rebrand · image library · new DB | **done** |
| 2 | Prisma rebuild · catalogue · category↔folder image integrity | **done** |
| 3 | Shops · cart · checkout · orders · appointments | **done** |
| 4 | Jeweller + admin dashboards | **done** |
| 5 | Full unit/integration/e2e test matrix · CI · production-readiness report | pending |
| 6 | Financial document verification module (OCR, no-LLM) | pending |

**Known limitation:** bracelet images are the weakest — the source corpus has no
clean high-res bracelet photos. Real product photography dropped into
`jewellery-images/<class>/` is the fix; the backend accepts any file in the
correct folder.

---

## Documentation

| File | |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | clean checkout → running app, troubleshooting |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | every env var, per environment, secrets policy |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | GitHub Pages + Render walkthrough |
| [`docs/AUDIT.md`](docs/AUDIT.md) | the de-AI repository audit + phase tracker |
| [`docs/WORKFLOW_AUDIT.md`](docs/WORKFLOW_AUDIT.md) | 57-point automated workflow audit results |
| [`docs/AUTH_ARCHITECTURE.md`](docs/AUTH_ARCHITECTURE.md) · [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md) · [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) · [`docs/SECURITY.md`](docs/SECURITY.md) | reference |

_`ARCHITECTURE.md`, `DATABASE.md`, `TESTING.md` are consolidated here / in `docs/` and expanded in Phase 5._

## License

Private / unpublished. All rights reserved by the owner.
