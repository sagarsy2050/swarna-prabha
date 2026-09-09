# API_DOCUMENTATION.md

Base URL: `${VITE_API_URL}` (dev: `http://localhost:4000`). All paths below are
under `/api`.

## Conventions

- **Auth:** `Authorization: Bearer <accessToken>` unless marked *public*.
- **Success:** single resource → `{ "data": <object> }`; collection →
  `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- **Error:** `{ "error": { "message", "code", "details"? } }` with an HTTP 4xx/5xx.
- **List query:** `?page=&pageSize=(≤100)&sort=field|-field&q=<search>&mine=true|false`
  plus resource-specific filters.
- **Bodies:** JSON. Validated with Zod — invalid input → `422` with `details[]`.
- **Rate limits:** global 300/min/IP; auth endpoints 30 / 15 min; AI endpoints 20 / 10 min per user.

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | `{ "status": "ok"\|"degraded", checks: {...} }`. `?deep=1` also probes Ollama. `200` when ok, `503` when degraded. |

## Auth  — see `docs/AUTH_ARCHITECTURE.md`

`POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` ·
`POST /auth/logout` · `GET /auth/me` · `PATCH /auth/me` ·
`POST /auth/change-password` · `POST /auth/forgot-password` ·
`POST /auth/reset-password`.

## Users (ADMIN)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/users` | list (`?role=`, `?q=`) |
| GET | `/users/:id` | one |
| POST | `/users` | create with any role (`{ email, password, role, fullName? }`) |
| PATCH | `/users/:id/role` | `{ role }` |
| PATCH | `/users/:id/active` | `{ isActive }` (revokes sessions when disabling) |

## Designs

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/designs` | public | published catalogue (`?category=&q=`). Staff: `?all=1` includes drafts. |
| GET | `/designs/:id` | public | one |
| POST | `/designs` | JEWELLER/ADMIN | `{ title, category, basePrice, description?, imageUrl?, materials?, customizableParts?, isPublished? }` |
| PATCH | `/designs/:id` | JEWELLER/ADMIN | partial |
| DELETE | `/designs/:id` | JEWELLER/ADMIN | |

## Design components

`GET/POST/PATCH/DELETE /components` — JEWELLER/ADMIN author; jeweller-scoped.
`{ name, type, designId?, materialOptions?, sizeOptions?, priceModifier?, isCustomizable?, constraints? }`.

## Customizations

`GET/POST/PATCH/DELETE /customizations` — customer-owned.
`{ designId?, selections, notes?, status? }`.

## Personalized recommendation engine

Full reference in **`docs/RECOMMENDATION_ENGINE.md`**. Summary:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/jewellery-categories` | public | extensible category list |
| GET/POST/PATCH/DELETE | `/jewellery-profiles[/:id]` | CUSTOMER | feature profiles (face/eye/nose/ear/neck; values or `UNKNOWN`) |
| POST | `/ai/analyze-profile` | CUSTOMER | photo → structured categories (never invented) |
| POST | `/ai/recommend-jewellery` | CUSTOMER | scored, ranked matches + `metrics` + `disclaimer` |
| POST | `/ai/generate-jewellery-concept` | CUSTOMER | concepts (CONCEPTS only); typed failure, never fake |
| POST | `/ai/visualize-jewellery` | any | single piece or "complete look"; honest `unsupported` on local text model |
| GET | `/materials` · POST `/materials/recommend` | any | catalogue · "AI Style Suggestion" |
| POST/PATCH/DELETE | `/materials[/:id]` | JEWELLER/ADMIN | configurable catalogue |
| POST | `/pricing/estimate` · `/pricing/estimate/batch` | any | **RAW estimate** — `label:"RAW ESTIMATE"`, `isQuotation:false`, disclaimer; never a quotation |
| GET/POST/PATCH/DELETE | `/saved-designs[/:id]` | CUSTOMER | Style-Studio working set |
| POST | `/designs/save` | CUSTOMER | alias of `POST /saved-designs` |
| POST | `/saved-designs/:id/send-to-jeweller` | CUSTOMER | creates a `DesignRequest` at `AI_CONCEPT_GENERATED` |
| GET | `/audit` · `/audit/:entityType/:entityId` | owner/ADMIN | journey audit trail |

## AI

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/ai/designs` | any | list your AI requests (`?status=`) |
| GET | `/ai/designs/:id` | owner/staff | request + result + validations |
| POST | `/ai/designs` | any | generate concepts. Body: `{ designId? \| design_title, category?, materials?, base_price?, customizable?, customizations?, customer_notes?, face_photo_url? }`. → `{ data: { id, status, result: { id, concepts, model }, concepts } }`. `503 AI_DISABLED`/`AI_UNAVAILABLE`/`AI_MODEL_MISSING` when Ollama is off / model not pulled — **never a fabricated result**. |
| POST | `/ai/design-concepts` | any | alias of the above (spec's example name) |
| POST | `/ai/designs/analyze` | any | `{ design_title?, category?, customizations?, customer_notes? }` → `{ summary, constraints[] }` |
| POST | `/ai/designs/visualize` | any | `{ face_photo_url, concept_name?, concept_description?, materials?, category? }` → `{ status: "ok"\|"unsupported", note, imageUrl? }`. Local text model → `unsupported` (no fake image). |
| POST | `/ai/visualize-jewellery` | any | alias of visualize |

## Design validations (JEWELLER/ADMIN)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/design-validations` | list (`?aiResultId=&verdict=&mine=true`) |
| GET | `/design-validations/:id` | one |
| POST | `/design-validations` | `{ aiResultId, conceptIndex, verdict: APPROVED\|NEEDS_MODIFICATION\|REJECTED, notes? }` — upserts per (result, concept, jeweller). `manufacturable` is derived (`APPROVED` ⇒ true). |
| PATCH | `/design-validations/:id` | `{ verdict?, notes? }` |

## Design requests (legacy MVP workflow — preserved)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/design-requests` | any | customers: own; jeweller/admin: all (`?status=&category=`) |
| GET | `/design-requests/:id` | owner/staff | one |
| POST | `/design-requests` | any | `{ designId?, designTitle, designImage?, category?, customerNotes?, customizations?, aiConcepts?, selectedConcept?, status? }` |
| PATCH | `/design-requests/:id` | owner or staff | customers may only set `status` to `ordered`/`rejected` or edit `customerNotes`; staff may set any `status`, `quotationPrice`, `jewellerNotes`, `selectedConcept` |
| DELETE | `/design-requests/:id` | owner/admin | |

### Workflow engine (see `docs/WORKFLOW.md`)

The `DesignRequest` carries an authoritative backend state machine. These step
endpoints are the **only** way `workflowState` changes; each writes an
append-only `WorkflowEvent`.

| Method | Path | Actor | From → To |
| --- | --- | --- | --- |
| GET | `/design-requests/:id/workflow` | participant | — (state + `availableActions` + `history`) |
| PATCH | `/design-requests/:id/customization` | CUSTOMER | `DESIGN_SELECTED\|CUSTOMIZING\|…` → `CUSTOMIZING` |
| POST | `/design-requests/:id/visualize` | CUSTOMER | `CUSTOMIZING` → `VISUALIZATION_READY` |
| POST | `/design-requests/:id/generate-concepts` | CUSTOMER→AI | `CUSTOMIZING\|VISUALIZATION_READY` → `AI_CONCEPT_GENERATED` |
| POST | `/design-requests/:id/manufacturing-check` | JEWELLER | `AI_CONCEPT_GENERATED` → `MANUFACTURING_CHECK` / `REJECTED` / `CUSTOMIZING`. Body `{ status: APPROVED\|REJECTED\|CHANGES_REQUIRED, materialApproved?, stoneApproved?, dimensionsApproved?, structureApproved?, notes? }` |
| POST | `/design-requests/:id/review` | JEWELLER | `MANUFACTURING_CHECK` → `JEWELLER_REVIEW` / `REJECTED` / `CUSTOMIZING`. Body `{ decision: APPROVED\|REJECTED\|CHANGES_REQUIRED, comments? }` |
| POST | `/design-requests/:id/quotation` | JEWELLER | `JEWELLER_REVIEW` → `QUOTATION_CREATED`. Body `{ lineItems:[{label,quantity,unitPrice}], taxRate?, currency?, validUntil?, notes?, title? }` — totals computed server-side; quotation is `jewellerAttestedManufacturable`. |
| POST | `/design-requests/:id/confirm-order` | CUSTOMER | `QUOTATION_CREATED` → `ORDER_CONFIRMED` (accepts the quotation + creates the Order) |
| POST | `/design-requests/:id/appointment` | CUSTOMER/JEWELLER | `ORDER_CONFIRMED` → `APPOINTMENT_SCHEDULED`. Body `{ scheduledDate, timeSlot, type?, notes? }` |
| POST | `/design-requests/:id/handover` | JEWELLER | `APPOINTMENT_SCHEDULED` → `HANDOVER_COMPLETED` (requires the Order `ready_for_handover`). Body `{ method?, handoverVerifiedBy? }` |
| POST | `/design-requests/:id/cancel` | CUSTOMER/ADMIN | any non-terminal → `CANCELLED`. Body `{ reason? }` |

Errors: `403 WORKFLOW_ACTOR` (wrong role), `409 WORKFLOW_STATE` (action not
legal from the current state — the message lists the states it is legal from).

## Quotations

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/quotations` | any | scoped to your customer/jeweller side (`?status=`) |
| GET | `/quotations/:id` | party/admin | one |
| POST | `/quotations` | JEWELLER/ADMIN | `{ customerId, lineItems:[{label,quantity,unitPrice}], title?, taxRate?, currency?, validUntil?, notes?, designValidationId?, jewellerAttestedManufacturable? }`. Totals computed server-side. |
| PATCH | `/quotations/:id` | customer → `{status:"accepted"\|"rejected"}`; jeweller/admin → edit fields while not accepted |

## Appointments

`GET/POST/PATCH/DELETE /appointments` — customers manage their own; jeweller/admin
see all and may complete. `POST` body: `{ scheduledDate, timeSlot, type:
consultation\|verification\|handover, notes?, jewellerId?, orderId?, requestId? }`.
Customers may only `PATCH` `status` to `cancelled`.

## Orders

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/orders` | any | scoped (`?status=`) |
| GET | `/orders/:id` | party/admin | full order (payments, production, QC, delivery, appointments) |
| POST | `/orders` | customer/admin | `{ quotationId }`. **Gated on manufacturability** — `422 NOT_MANUFACTURABLE` otherwise. Creates a `Production` row (`queued`). |
| PATCH | `/orders/:id/status` | JEWELLER/ADMIN | `{ status }`. Constrained transitions (see `order.service.js`). |
| GET / PATCH | `/orders/:id/production` | party / JEWELLER-ADMIN | `{ stage, notes?, assignedTo? }` |
| GET / PUT | `/orders/:id/delivery` | party / JEWELLER-ADMIN | `{ method, status, trackingRef?, address?, handoverVerifiedBy?, appointmentId? }`. In-person `handed_over` requires `handoverVerifiedBy`; completing it moves the order to `completed`. |

## Payments

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/payments` | any | scoped (`?orderId=&status=`) |
| GET | `/payments/:id` | party/admin | one |
| POST | `/payments` | customer/admin | `{ orderId, amount?, method? }`. `manual` provider → `Payment` row stays `pending` with `instructions`; **no auto-success**. |
| POST | `/payments/:id/confirm` | JEWELLER/ADMIN | mark received. When succeeded payments cover the order total, the order moves to `paid`. |
| POST | `/payments/:id/refund` | ADMIN | mark refunded |

## Production / Quality / Delivery (flat boards)

- `GET /production` — production rows scoped to your orders (`?stage=`).
- `GET /quality-checks`, `POST /quality-checks` (JEWELLER/ADMIN) —
  `{ orderId, passed, inspector?, checklist?, notes? }`. A passed check while the
  order is in `quality_check` advances it to `ready_for_handover`.
- `GET /delivery`, `GET /delivery/:orderId` — delivery board / one.

## Inventory (JEWELLER/ADMIN)

`GET/POST/PATCH/DELETE /inventory` — jeweller-scoped.
`{ sku, name, category?, material?, quantity?, unitCost?, reorderLevel?, location? }`.

## Files

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/files` | any | `multipart/form-data`, field `file` (+ optional `purpose`). ≤ 8 MB, images only. → `{ data: { id, key, url, file_url, mime, size } }` (`file_url` for Base44 compatibility). |
| DELETE | `/files/:id` | owner/admin | remove object + row |

Local uploads are served at `GET /uploads/<key>` when `STORAGE_DRIVER=local`.
