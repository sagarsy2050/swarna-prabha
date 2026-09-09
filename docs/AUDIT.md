# Swarna Prabha — Repository Audit

_Baseline audit of `D:\Golden Aura` (formerly "Jeweller AI" / Base44 migration),
taken at the start of the de-AI rebuild. Items are fixed in the phase noted, not
merely documented._

## Method

Full read of `server/src`, `client/src`, `prisma/schema.prisma`, config, infra and
docs. The app was a working AI-first bespoke-jewellery platform; the target is a
deterministic, no-LLM marketplace (catalogue → classified images → shops →
appointments → online orders).

---

## Summary by area

| Area | State | Notes / action |
|---|---|---|
| **AI / LLM (Ollama concept gen, prompts)** | UNUSED / REMOVE | `integrations/ai/**` deleted (Phase 1). |
| **Virtual try-on / image compositing (`sharp`)** | UNUSED / REMOVE | provider + dep deleted (Phase 1). |
| **Recommendation engine (scoring, profiles, face shapes)** | UNUSED / REMOVE | services, routes, config, models removed (P1 code, P2 schema). |
| **Bespoke workflow state machine** (DesignRequest, manufacturability, quotation, production, QC, delivery) | REMOVE | replaced by a direct catalogue→cart→order flow (P2–P3). |
| **`ml/` local Stable-Diffusion pipeline (17 GB)** | UNUSED / REMOVED | deleted from repo; full copy retained in `D:\jweellae`. |
| **`data/` ML training corpora (1.9 GB)** | UNUSED / REMOVED | ~40 imgs/class curated into `jewellery-images/`; rest deleted. |
| **Auth (JWT access+refresh, bcrypt, rotation, password reset)** | WORKING | keep; RBAC + rate-limit hardening in Phase 4. |
| **Catalogue (`Design` model, public list, filters)** | PARTIALLY WORKING | only a 5-value enum + free-text `materials`; no metal/purity/weight/stone, no category table, no image integrity. Rebuilt as `Product` + `JewelleryCategory` + `ProductImage` (P2). |
| **Product images** | UNSAFE | seed used remote Unsplash URLs; no category↔image binding. Replaced by `jewellery-images/<folder>/` as the sole source + backend folder validation (P2). |
| **Shops / jeweller discovery** | MISSING | no shop entity or discovery UI. `JewellerProfile` extended into a shop; `/api/shops` + pages added (P3). |
| **Cart** | MISSING | no cart model or endpoints. `Cart`/`CartItem` + checkout added (P3). |
| **Orders** | NOT PRODUCTION READY | `Order` *required* a bespoke `quotationId`; no stock handling. Rebuilt around `OrderItem` + transactional stock decrement + status machine (P3). |
| **Payments** | PARTIAL | `manual` + stub `stripe`. Stripe removed; manual-only `Payment` rows, human-confirmed (P1 code / P3 flow). |
| **Appointments** | PARTIALLY WORKING | CRUD only; no availability, no double-booking guard, bespoke `type` values. Rebuilt with server-side slot availability + partial unique index (P3). |
| **Jeweller dashboard** | PARTIALLY WORKING / AI-COUPLED | tabs call removed AI/workflow APIs. Rebuilt: products, inventory, appointments, orders, customers, shop profile (P4). |
| **Admin dashboard** | PARTIALLY WORKING | rebuilt: users, jewellers/shops, categories, products, images, inventory, orders, appointments (P4). |
| **Customer pages** (StyleStudio, MyRequests, MyQuotations) | REMOVE | deleted (Phase 1). Replaced by Catalog / Detail / Cart / Checkout / Orders / Appointments. |
| **Inventory** | WORKING | owner-scoped CRUD kept. |
| **File upload (`multer`, storage drivers)** | PARTIAL | works; needs type/size/magic-byte/path-traversal hardening (P4) and a private store for financial docs (P6). |
| **Health endpoint** | PARTIALLY WORKING | leaked AI/imageGen internals. Trimmed to db/storage/payment; deep = DB ping only (Phase 1). |
| **Config / env** | UNSAFE-ish | AI/Ollama/ML/tryon vars + committed dev secrets pattern. AI vars removed (Phase 1); secret handling reviewed (P4). |
| **`docker-compose` / DB** | NEEDS CHANGE | shared the `jweellae` DB. New `goldenaura` DB; compose + initdb updated (Phase 1). |
| **`shared/constants.js`** | STALE | old enum lists. Rewritten with final enums (P3). |
| **`middleware/schemas.js`** | PARTIALLY STALE | many dead zod bodies (pure, harmless). Trimmed in P2. |
| **Tests** | THIN | 14 unit pass; integration needs a DB. AI/workflow tests deleted. Full unit/integration/e2e suite built in P5. |
| **CI/CD** | MISSING | added in P5 (`.github/workflows/ci.yml`). |
| **Docs** | PARTIALLY STALE | AI/bespoke docs deleted; full set (`README ARCHITECTURE DATABASE API AUTH SECURITY TESTING DEPLOYMENT`) written in P5. |
| **Financial verification module** | MISSING | new `server/src/modules/financial/**` (OCR + deterministic validation + matching), Phase 6. |

---

## Phase 1 — completed in this pass

- Deleted `ml/` (17 GB) and `data/` (1.9 GB). Backups remain in `D:\jweellae`.
- Curated `jewellery-images/{rings,earrings,necklaces,bracelets}/` (40 each) +
  empty `bangles/`. Served read-only at `/jewellery-images`.
- Deleted the entire AI layer: `integrations/ai/**`, `config/faceShapes.js`,
  `config/recommendation.js`, `integrations/payment/StripePaymentProvider.js`,
  `controllers/workflow.controller.js`, `middleware/workflowGuard.js`,
  17 AI/bespoke route files, 20 AI/bespoke service files, 2 catalogue scripts,
  10 AI/bespoke test files, 3 client pages.
- `routes/index.js` now mounts only `health auth users appointments inventory files`.
- `config/index.js` stripped of all AI/Ollama/ML/try-on vars; `PAYMENT_DRIVER` → `manual` only.
- Rebranded "Jeweller AI" / "Jweellae" → **Swarna Prabha** (client UI, index.html,
  manifest, server banner, mail-from, JWT issuer, package names).
- New `goldenaura` / `goldenaura_shadow` / `goldenaura_test` databases; env files,
  `docker-compose.yml` + `docker/initdb/` updated.
- Dropped the `sharp` dependency.

**Verified:** server lint clean · 14/14 unit tests pass · client lint clean ·
client production build succeeds · server boots as "Swarna Prabha API" ·
`/api/health?deep=1` exposes only db/storage/payment · `/api/appointments` → 401
without auth · `/jewellery-images/rings/ring-001.jpg` → 200.

**Known temporary gaps (rebuilt in P2–P4):** `/catalog`, `/design/:id`, `/jeweller`,
`/admin`, `/my-orders`, `/appointments` pages still reference the old API surface
and are stubs until their phase. The Prisma schema still contains the old models
until Phase 2's single clean migration.
