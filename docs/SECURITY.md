# SECURITY.md

Security review of the migrated application, and the controls in place.

## Summary of controls

| Area | Control |
| --- | --- |
| Passwords | `bcryptjs` cost 12; min length 8; never returned by the API (`publicUser()` strips `passwordHash`). |
| Sessions | 1h access JWT + rotating opaque refresh token stored **hashed**. Refresh TTL defaults to ~10 years so users/admins stay logged in until they log out (`JWT_REFRESH_TTL` tunable). Revocation is unaffected: logout / password change/reset / admin-disable revoke the refresh token immediately, and every request re-checks `user.isActive` (a disabled account loses access within ≤1h). |
| Secrets | All via env. `config/index.js` validates them at boot and **exits** if missing/short (`JWT_*` must be ≥ 8 chars). No secret in client code or client env. `.env` files git-ignored; only `.env.example` committed. |
| AI keys | **None.** AI is local Ollama only; no cloud provider, no API key anywhere. All AI calls go through the server — the browser never talks to an LLM. |
| SQL injection | Prisma parameterises every query; no raw SQL with interpolation (the one `TRUNCATE` is test-only, over a hard-coded table list). |
| Input validation | Zod schemas on body/query/params for every write route and most reads; unknown fields dropped, types coerced, lengths bounded. |
| AuthZ | `requireRole()` on staff routes; row ownership enforced in services (customers cannot read/modify others' requests, quotations, orders, payments, appointments, customizations). |
| Order integrity | Manufacturability gate (`422 NOT_MANUFACTURABLE`) prevents ordering unvalidated AI concepts; constrained order status transitions; in-person handover requires an explicit `handoverVerifiedBy`. |
| CORS | `cors({ origin: <allowlist from CORS_ORIGIN>, credentials: true })`. Unknown origins are rejected. Comma-separated list supported for multiple clients. |
| Headers | `helmet()` (HSTS in prod, `X-Content-Type-Options`, frameguard, etc.); `x-powered-by` disabled; `Cross-Origin-Resource-Policy: cross-origin` only on the API + uploads so images embed. |
| Rate limiting | Global 300/min/IP; `/api/auth/*` 30 / 15 min; `/api/ai/*` 20 / 10 min per user. |
| File uploads | `multer` memory storage, **8 MB** cap, single file, MIME allowlist (`image/jpeg|png|webp|gif|avif`). Bytes go to disk/S3, never the DB. Local keys are contained to `UPLOAD_DIR` (path-traversal guarded). Files served with `index: false`. |
| XSS | React escapes by default; no `dangerouslySetInnerHTML` anywhere in the client. API returns JSON only. |
| CSRF | State-changing requests authenticate via `Authorization: Bearer` (not an ambient cookie), so cross-site form posts cannot act as the user. The refresh cookie is `SameSite` and only honoured at `/api/auth/refresh`, which rotates it. If cookie-session auth is ever added, add a double-submit CSRF token. |
| Logging | `morgan` request logs + a small logger; **no** passwords, tokens, or full request bodies are logged. Password-reset links are logged **only** in non-production (`MAIL_DRIVER=console`). |
| Error handling | Central handler; stack traces and internal messages are suppressed in production (`NODE_ENV=production`) — clients get `{ error: { message, code } }` only. Prisma errors are mapped to safe messages (`P2002`→409, `P2025`→404, …). |
| User enumeration | Login returns a generic error and does bcrypt work regardless of account existence; `forgot-password` always returns `{ ok: true }`. |
| Dependencies | No `@base44/*`. `npm install` in `client/` and `server/` completes with `found 0 vulnerabilities` at time of writing (`npm audit` to re-check). |

## Known limitations / follow-ups

- **Email verification on registration** is not implemented (the Base44 OTP step was dropped). Until added, a registrant can use any email address they control the inbox of — acceptable for this stage, tracked in `docs/AUTH_ARCHITECTURE.md`.
- **Refresh-token reuse detection** (revoke the whole family if a rotated token is replayed) is not implemented — rotation + expiry only.
- **Account lockout / progressive delay** after repeated failed logins is not implemented; rate limiting is the only brake.
- **Content Security Policy** is left permissive (`contentSecurityPolicy: false` in helmet) because the SPA is served separately; tighten it on the static host (Render static site headers) once the asset origins are fixed.
- **Payments** use the honest `manual` provider (records real rows, human confirmation). A real card processor (Stripe) must add webhook signature verification before going live.
- **Audit log** of privileged actions (role changes, payment confirmations, handovers) is not implemented — recommended before production.
- **HTTPS / `TRUST_PROXY`** must be set (`TRUST_PROXY=1`) behind Render's proxy so `Secure` cookies and client IPs work.

## Secrets checklist before any deploy

- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random, unique per environment (Render `generateValue`).
- [ ] `DATABASE_URL` — from the managed DB, not committed.
- [ ] `CORS_ORIGIN` — the exact client origin(s), no wildcard.
- [ ] `TRUST_PROXY=1` on Render.
- [ ] S3 / SMTP credentials — dashboard-entered, never in git.
- [ ] `.env` absent from the repo (`git status` clean; `.gitignore` covers it).
