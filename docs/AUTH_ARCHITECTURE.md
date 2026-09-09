# AUTH_ARCHITECTURE.md

First-party authentication replacing Base44's hosted auth.

## Tokens

| Token | Type | Lifetime | Storage | Transport |
| --- | --- | --- | --- | --- |
| **Access** | JWT (HS256), claims `sub`, `role`, `email`, `iss:"jweellae"` | `JWT_ACCESS_TTL` (default **1h**) | client memory + `localStorage` mirror | `Authorization: Bearer <token>` |
| **Refresh** | opaque 48-byte base64url random | `JWT_REFRESH_TTL` (default **3650d** ≈ 10 years) | server: **SHA-256 hash** in `RefreshToken` table; client: `httpOnly; Secure(prod); SameSite=None(prod)/Lax(dev)` cookie `jw_refresh`, path `/api/auth`, `Max-Age` = the refresh TTL | cookie, automatic |

**Long-lived sessions:** by default a signed-in user or admin stays signed in
**until they explicitly log out** — the client silently renews the 1-hour access
token from the refresh cookie on every load and on any `401`. Shorten
`JWT_REFRESH_TTL` (e.g. `30d`, `12h`) if you need sessions to expire on their own.
This does **not** weaken revocation: logout, password change/reset, and an admin
disabling the account all revoke the refresh token immediately, and every
authenticated request re-checks `user.isActive` in the DB, so a disabled account
loses access within one access-token lifetime (≤ 1h) regardless of the TTL.

- Only the refresh token's **hash** is stored, so a DB dump exposes no usable tokens.
- Refresh is **rotated**: `POST /api/auth/refresh` revokes the presented token and issues a new pair. A revoked/expired token → `401`.
- **Logout** (`POST /api/auth/logout`) revokes the current refresh token; changing password or resetting it revokes **all** of the user's refresh tokens.
- The access token is verified statelessly, but `authenticate` middleware also re-checks `user.isActive` against the DB, so a disabled account cannot keep using an unexpired token.

## Password handling

- `bcryptjs`, cost **12** (`server/src/utils/password.js`).
- Minimum length **8**, enforced in one place (`assertPasswordStrength`) used by the service, Zod schema, and tests.
- `passwordHash` is stripped from every API response by `publicUser()`.
- Login does a bcrypt comparison whether or not the email exists (reduces user-enumeration timing signal) and returns a generic `Invalid email or password`.

## Roles & authorization

`Role` enum: `CUSTOMER` (default for public registration), `JEWELLER`, `ADMIN`.

- **Public registration always creates a `CUSTOMER`.** Elevated roles are granted only by an admin (`PATCH /api/users/:id/role`) or the seed script.
- `requireRole(...roles)` middleware gates staff routes (`/api/designs` writes, `/api/quotations` create, `/api/users/*`, order status transitions, QC, delivery, inventory).
- Row-level ownership is enforced in the services:
  - `crudService` scopes list/get/update/delete to `ownerField` for non-staff roles; `?mine=true` forces own-only.
  - Quotations/orders/payments/appointments check `customerId`/`jewellerId` against `req.user.id` (admins bypass).

## Request lifecycle

```
Browser ──(Bearer access)──► authenticate ──► requireRole? ──► validate(zod) ──► controller ──► service ──► Prisma
   │                              │
   │ 401 (expired) ◄──────────────┘
   ▼
POST /api/auth/refresh  (httpOnly cookie, once per request in http.js) ──► new access ──► retry original
```

`client/src/api/http.js` performs the silent refresh-and-retry exactly once per
request and de-duplicates concurrent refreshes.

## Password reset flow

1. `POST /api/auth/forgot-password { email }` — always returns `{ ok: true }` (no account disclosure). If the account exists, a single-use token (SHA-256 hashed, 1h TTL) is stored in `PasswordResetToken` and a link is sent via the configured mailer. In dev (`MAIL_DRIVER=console`) the link is printed to the API log.
2. `POST /api/auth/reset-password { token, newPassword }` — validates the token (unused, unexpired), sets the new hash, marks the token used, revokes all refresh tokens, in one transaction.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | none (rate-limited) | create customer + session |
| POST | `/api/auth/login` | none (rate-limited) | session |
| POST | `/api/auth/refresh` | refresh cookie | rotate session |
| POST | `/api/auth/logout` | refresh cookie | revoke |
| GET | `/api/auth/me` | access | current user (+ profiles) |
| PATCH | `/api/auth/me` | access | update own profile |
| POST | `/api/auth/change-password` | access | change password (revokes sessions) |
| POST | `/api/auth/forgot-password` | none (rate-limited) | request reset |
| POST | `/api/auth/reset-password` | none (rate-limited) | complete reset |

## Not implemented (documented extension points)

- **Email verification / OTP on register** — the Base44 flow had it; re-add with a `PasswordResetToken`-style `EmailVerificationToken` and a gate in `authenticate`.
- **Google / third-party OAuth** — add an `/api/auth/oauth/:provider` callback that upserts a `User` and issues the same session; `client/src/lib/authReturnTo.js` is already provider-agnostic.
- **CSRF** — not required for the current design: the API is pure JSON with `Authorization: Bearer` (not cookie-authenticated for state changes), and the refresh cookie is `SameSite` + only accepted at `/api/auth/refresh` which itself rotates. If cookie-based session auth is added later, add a double-submit CSRF token.
