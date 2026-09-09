# DATABASE_SETUP.md

PostgreSQL via **Prisma**. Schema: `server/prisma/schema.prisma`. Migrations:
`server/prisma/migrations/`.

## Local (Docker — recommended)

`docker-compose.yml` runs PostgreSQL 16 on **host port 5433** (5432 is often
already taken by another local Postgres) with:

```
user     jweellae
password jweellae
database jweellae
```

> `jweellae` here is an infrastructure identifier (DB/user/password), not product
> branding. Change it freely — update `DATABASE_URL` in `server/.env` to match.

```bash
npm run db:up            # docker compose up -d db
# one-time: create the extra databases used for tests + prisma's shadow DB
docker exec jweellae-db psql -U jweellae -d jweellae -c "CREATE DATABASE jweellae_test;"
docker exec jweellae-db psql -U jweellae -d jweellae -c "CREATE DATABASE jweellae_shadow;"

npm --prefix server run prisma:generate
npm run db:migrate       # prisma migrate deploy  (applies existing migrations)
npm run db:seed          # node prisma/seed.js
```

`npm run db:down` stops it; the data volume `jweellae_pgdata` persists across
restarts. `docker compose down -v` wipes it.

## Local (your own PostgreSQL)

Create a database and set `server/.env`:

```
DATABASE_URL=postgresql://USER:PASS@localhost:5432/jeweller_ai?schema=public
SHADOW_DATABASE_URL=postgresql://USER:PASS@localhost:5432/jeweller_ai_shadow?schema=public
```

Then `prisma:generate`, `db:migrate`, `db:seed` as above.

## Environment variables

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Prisma connection string. Never hard-coded — read from env only. |
| `SHADOW_DATABASE_URL` | dev only | needed by `prisma migrate dev` to diff schema changes. Not used by `migrate deploy`. |

No credentials live in source. `server/.env` is git-ignored; `server/.env.example`
is committed with placeholder values.

## Data model (overview)

Identity: `User` (`role: CUSTOMER|JEWELLER|ADMIN`), `CustomerProfile`,
`JewellerProfile`, `RefreshToken`, `PasswordResetToken`.

Catalogue: `Design`, `DesignComponent`.

Design/AI workflow: `Customization`, `AiDesignRequest` → `AiDesignResult`
(concepts JSON) → `DesignValidation` (jeweller's binding verdict per concept).

Legacy MVP record (preserved from the Base44 app so `MyRequests` /
`JewellerDashboard` keep working): `DesignRequest`.

Commerce: `Quotation` → `Order` → `Payment`, `Production`, `QualityCheck`,
`Delivery`; plus `Appointment` and `InventoryItem`. `FileObject` tracks uploads.

Money is `Decimal(12,2)`; JSON payloads are typed `Json` columns; every table has
`createdAt` / `updatedAt` (except append-only rows); foreign keys are real with
sensible `onDelete` (`Cascade` for owned children, `SetNull` for soft links,
`Restrict` on `Order.quotationId`).

### The manufacturability rule

An `Order` can be created from a `Quotation` only when either:
- the quotation references a `DesignValidation` with `verdict = APPROVED`
  (`manufacturable = true`), **or**
- the jeweller set `jewellerAttestedManufacturable = true` on the quotation
  (fully bespoke pieces validated offline).

The AI only ever produces a *suggested* `feasibility` on a concept; it is never
authoritative. Enforced in `server/src/services/manufacturability.js` +
`order.service.js` (covered by unit and integration tests).

## Common commands

```bash
npm --prefix server run prisma:studio        # browse data
npm --prefix server run prisma:migrate:dev   # create a new migration after editing schema.prisma
npx --prefix server prisma migrate reset      # DROP + re-create + re-seed (dev only!)
```

## Production

Run `prisma migrate deploy` as a **pre-deploy** step (see
`docs/RENDER_DEPLOYMENT.md`). It only applies committed migrations and never
prompts. The seed script is upsert-based and safe to run once after the first
deploy to create the admin account (set the `SEED_*` env vars first).
