# Workflow Audit — point by point

Automated end-to-end audit of every workflow against the running API. Re-run any
time with:

```bash
npm run dev            # or start the API another way
node server/scripts/workflow-audit.mjs
```

Last run: **57 / 57 passed, 0 failed.**

## Authentication

| # | Check | Result |
|---|---|---|
| 1 | Register a customer → `201`, role `CUSTOMER` | PASS |
| 2 | Wrong password → `401` | PASS |
| 3 | admin / jeweller / customer all log in | PASS |
| 4 | `GET /api/auth/me` with token returns the right user | PASS |
| 5 | `GET /api/auth/me` without token → `401` | PASS |

## Health

| 6 | `/api/health?deep=1` → `ok`, checks = `database/storage/payment` only (no AI keys) | PASS |

## Catalogue

| 7 | `GET /api/categories` → 6, each with `productCount` | PASS |
| 8 | `GET /api/products` total = 96 | PASS |
| 9 | `?category=rings` → 24 | PASS |
| 10 | **No cross-folder image leak** — every ring product image is under `/jewellery-images/rings/` | PASS |
| 11 | `?category=bangles` → 0 (drives the "No jewellery available" empty state) | PASS |
| 12 | `?metal=Platinum&priceMin=20000` → only Platinum products ≥ ₹20,000 | PASS |
| 13 | `GET /api/products/facets` returns distinct metal/purity/stone + price range | PASS |
| 14 | Product detail returns full specs + images + shop | PASS |
| 15 | Unknown product id → `404` | PASS |

## Classification integrity (writes)

| 16 | Create product with an **earring** image in the **rings** category → `422 IMAGE_CATEGORY_MISMATCH` | PASS |
| 17 | Create product with a valid `rings/` image → `201` | PASS |
| 18 | Jeweller edits their own product | PASS |
| 19 | Jeweller **cannot** edit another jeweller's product → `403` | PASS |

## Shops

| 20 | `GET /api/shops` → 2 active shops, each with `productCount` | PASS |
| 21 | `GET /api/shops/:slug` → products + opening hours | PASS |
| 22 | `GET /api/shops/me` for a jeweller | PASS |
| 23 | Customer **cannot** `GET /api/shops/me` → `403` | PASS |
| 24 | Jeweller updates own shop profile | PASS |
| 25 | Admin `GET /api/shops?all=1` includes inactive | PASS |

## Cart & checkout

| 26 | Add two items → cart itemCount = 3 | PASS |
| 27 | Update quantity | PASS |
| 28 | Remove an item (qty 0) | PASS |
| 29 | `POST /api/orders` (checkout) → order(s) created | PASS |
| 30 | Each order has a `PENDING` Payment row | PASS |
| 31 | **Stock decremented** transactionally (5 → 2) | PASS |
| 32 | Cart cleared after checkout | PASS |

## Order status

| 33 | Jeweller `CONFIRMED` → Payment flips to `PAID` | PASS |
| 34 | Illegal transition (`CONFIRMED → DELIVERED`) → `409` | PASS |
| 35 | Customer **cannot** set order status → `403` | PASS |
| 36 | `CANCELLED` **restocks** (2 → 5) | PASS |
| 37 | Customer sees only their own orders | PASS |
| 38 | Jeweller sees only their shop's orders | PASS |

## Appointments

| 39 | `GET /api/appointments/availability` returns open slots | PASS |
| 40 | Book a slot → `PENDING` | PASS |
| 41 | **Double-book the same slot → `409 SLOT_TAKEN`** | PASS |
| 42 | Past date rejected | PASS |
| 43 | Customer **cannot** confirm → `403` ("Customers can only cancel") | PASS |
| 44 | Jeweller confirms | PASS |
| 45 | Customer cancels their own | PASS |
| 46 | A cancelled slot is freed for re-booking | PASS |

## RBAC

| 47 | Customer → `POST /api/products` → `403` | PASS |
| 48 | Customer → `GET /api/users` → `403` | PASS |
| 49 | Jeweller → `GET /api/users` → `403` | PASS |
| 50 | Customer → `POST /api/categories` → `403` | PASS |
| 51 | Jeweller → `POST /api/categories` → `403` (admin only) | PASS |
| 52 | Admin lists users | PASS |

## Admin dashboard data

| 53 | Admin: all shops | PASS |
| 54 | Admin: all categories | PASS |
| 55 | Admin: all products (incl. drafts) | PASS |
| 56 | Admin: all orders | PASS |
| 57 | Admin: all appointments | PASS |

## Notes / known limitations

- **Bracelet images** are the weakest — the source corpus has no clean high-res
  bracelet shots. Rings/earrings are ~512–690 px; necklaces are upscaled to
  768 px (deterministic Lanczos + unsharp, not generation).
- Payments are `manual` — no gateway. A `PENDING` Payment is created at checkout
  and flips to `PAID` when the jeweller confirms the order.
- Phases **5** (full unit/integration test suite, CI, prod-readiness report) and
  **6** (financial OCR module) are not built yet.
