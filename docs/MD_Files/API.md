# NEXORA | REST API Reference and Maintenance Plan

**Document:** `API.md`  
**Draft version:** Proposed 3.0  
**Prepared:** November 15, 2026  
**Status:** PROPOSED, pending owner review. No existing documentation, API, source, or database was changed.  
**Architecture authority:** `NEXORA_ARCHITECTURE_V2.1.md` until an approved revision is adopted.  
**Current progress authority:** latest `AGENTS.md` checkpoint.  
**Related planning:** approved `TECHNICAL_PLAN_APPROVED.md`; proposed `SYSTEM_DESIGN_PROPOSED.md` and `SCREEN_FLOWS_PROPOSED.md` are not adopted contracts.

## 1. Scope, evidence, and status labels

This document catalogs HTTP routes explicitly recorded in the uploaded `API.md` and `AGENTS.md`, plus the separate source-map and route descriptions in `AI_HANDOFF.md`. It identifies source files from `DIRECTORY_STRUCTURE.md` and the handoff. The uploaded documentation is not a live source tree or a new runtime test. **An endpoint is not considered newly verified merely because it appears here.**

- **DOCUMENTED EXISTING:** recorded as installed in the uploaded API / latest AGENTS development checkpoint. Verify the present controller before changing it.
- **ISOLATED DESIGN / TRANSFER CHECK:** present in the separately inspected guest-booking redesign sources according to `AI_HANDOFF.md`; transfer to main was subsequently owner-reported complete, but specific route registration must be rechecked against main.
- **PROPOSED:** requested for the new policies, not an implemented path or approved wire contract.
- **DEFERRED:** specifically excluded, including NFC hardware endpoints.

The older `API.md` introduction says Phase 7 is in progress and some sections say payment writes are not started. The later `AGENTS.md` section C reports Phase 7 completed. Preserve the more recent checkpoint and treat older text as historical, not a justification to invent the newer controller inventory. `AI_HANDOFF.md` describes a main/isolated source difference and later transfer; source-file mappings below are documented paths, not fresh inspection.

### Compatibility baseline

- Shared NestJS/Express REST API, global prefix **`/api`**, local default `http://localhost:3000/api`.
- React guest and admin applications use Axios; neither accesses Prisma directly.
- JSON and camelCase for ordinary requests, with multipart image uploads and binary image reads as exceptions.
- Opaque string IDs; monetary amounts in **integer PHP centavos**; original nightly stay calendar inputs in `YYYY-MM-DD`; event instants in UTC; Philippine time (`Asia/Manila`) for property calendar and arrival decisions.
- Public room and availability reads are scoped projections, not database object dumps. Do not expose password/session hashes, provider credentials, sensitive guest data, or NFC cryptographic material.
- The current API does **not** have one universal response/error envelope. Many feature responses use `{data: ...}`, auth registration uses an acknowledgment, logout/image reads differ, and errors use Nest's standard shapes.
- Current protected routes require JWT unless explicitly public or booking-session scoped. `@Public()` does not skip throttling, validation, or dedicated Origin checks.

## 2. Environment variable reference

Only names supported by uploaded documents are asserted as existing configuration names. **Do not paste actual values into documentation.** The precise `.env.example`, `auth.config.ts`, `main.ts`, `prisma7.config.ts`, and frontend configurations should be inspected for a complete current key inventory.

| Variable or family | Scope and purpose | Source / verification limit |
|---|---|---|
| `DATABASE_URL` | Prisma CLI database target | `AGENTS.md` and `AI_HANDOFF.md`; CLI and running application may target different files |
| `NEXORA_RUNTIME_DATABASE_URL` | Runtime database override, especially isolated test fixture | `AGENTS.md`, `AI_HANDOFF.md`; require an absolute test `file:` path for isolated verification |
| `NODE_ENV` | Environment-dependent cookie `Secure` behavior | `API.md` auth and booking-access contracts |
| `PAYMONGO_TEST_SECRET_KEY` | Backend-only PayMongo test API key | `AI_HANDOFF.md`; keep server-side |
| `PAYMONGO_TEST_WEBHOOK_SECRET` | Backend-only signature verification secret | `API.md` Phase 7.3, `AI_HANDOFF.md`; distinct from API key |
| `BOOKING_ACCESS_URL` | Base URL for private emailed booking-access links | `AGENTS.md`; exact value private |
| `SMTP_*` | Existing backend email-delivery configuration family | `AGENTS.md`, `SECURITY.md`; individual supported names require `.env.example` inspection |
| `NEXORA_BOOKING_DEADLINE_WORKER_ENABLED` | Explicitly gated guest-booking deadline worker | `AGENTS.md`, `AI_HANDOFF.md`; defaults disabled in documented main startup; isolated .test.db safeguards apply |
| Frontend `VITE_*` | Public build-time frontend configuration family | Documentation confirms Vite env use, but exact key names require project source inspection. Never put server secrets in these variables |
| JWT, Origin/CORS, backend port configuration | Backend secrets and allowlist settings | Behavior is documented, but **exact environment key names are not confirmed here**. Inspect configuration files rather than inventing names |

**Documented local defaults, not hard guarantees:** backend `3000`, guest `5175`, admin `5176`, guest/admin API base `http://localhost:3000/api`. Current running configuration must be verified. SQLite runtime and Prisma CLI targets require explicit comparison before any migration or test. Never run test fixtures against `backend/dev.db`.

### Configuration and secrecy checklist

- [ ] Read `backend/.env.example` and backend configuration before editing any env reference.
- [ ] Verify runtime and CLI SQLite targets separately.
- [ ] Restrict CORS to configured origins and allow credentials only where needed.
- [ ] Keep JWT, SMTP, PayMongo, database, and encryption secrets out of frontend assets, API payloads, logs, and Git.
- [ ] Keep webhook signature verification enabled for provider callbacks; neither a browser return nor CORS authenticates a payment.
- [ ] Do not enable the deadline worker on main development data without separate scoped authorization.

## 3. Route access categories and semantics

| Access | Definition |
|---|---|
| Public | No access JWT; DTO, throttler, and applicable Origin requirements still apply |
| Guest-owned | Active JWT user and explicit reservation ownership, or an approved separately scoped guest-access capability |
| Booking session | Valid HttpOnly `nexora_booking_access` cookie, scoped to booking-access endpoints; no administrative privileges |
| Staff | Active JWT user with explicit eligible role; current documented set: ADMIN, MANAGER, RECEPTIONIST |
| Provider | Original raw PayMongo callback bytes and verified test-mode HMAC signature, no browser Origin or JWT |
| Super Admin (PROPOSED) | Owner-approved new role and sensitive financial/audit actions, **not** asserted installed |

**Ownership:** Do not treat a booking reference plus email as authorization. Current accountless access uses a single-use emailed link and scoped cookie. The proposed mandatory verified-account policy must be coordinated with historical accountless access, rather than disabling legacy ownership protections prematurely.

**Status codes:** 400 validation, 401 missing/invalid authentication or private credential, 403 forbidden role/Origin, private 404 hides inaccessible records, 409 business conflict or review-required state, 413 oversized image, 429 throttle, 500 internal/configuration error. The webhook route additionally uses 503 for unavailable signing configuration or failure to durably persist. Route-specific behavior overrides this general outline.

## 4. Documented health and authentication endpoints

| Method | Path | Description / access | Mapped source |
|---|---|---|---|
| GET | `/api/health` | Public health status | `backend/src/app.controller.ts` |
| GET | `/api/auth-check` | Protected diagnostic only; not a business API | Source controller registration must be verified; referenced in `API.md` |
| POST | `/api/auth/register` | Public, 3/min; allowlisted Origin; creates pending guest identity, generic response for existing email | `backend/src/auth/auth.controller.ts`, `registration.service.ts`, `dto/register.dto.ts` |
| GET | `/api/auth/verify-email` | Public, 10/min; consumes single-use verification, no controller Origin requirement | `auth.controller.ts`, `email-verification.service.ts`, `dto/verify-email.dto.ts` |
| POST | `/api/auth/resend-verification` | Public, 3/min; allowed Origin; generic acknowledgment | `auth.controller.ts`, `registration.service.ts`, `email-verification.service.ts` (verify exact call graph) |
| POST | `/api/auth/login` | Public, 5/min; allowed Origin; returns 15-minute access JWT and refresh cookie | `auth.controller.ts`, `auth.service.ts`, `dto/login.dto.ts` |
| POST | `/api/auth/refresh` | Public, 20/min; allowed Origin; rotates refresh session family | `auth.controller.ts`, `auth.service.ts` |
| POST | `/api/auth/logout` | Public, 20/min; allowed Origin; revokes refresh family, clears cookie, 204 | `auth.controller.ts`, `auth.service.ts` |

**Auth contract:** registration `firstName` / `lastName` 1–100 chars, email max 254, password 12–128. Login password 1–1024. Verify-email token exactly 64 lowercase hex characters. Registration creates `PENDING` accounts, email verification transitions eligible identity to `ACTIVE`. Access TTL 900 s, refresh seven days; `nexora_refresh` cookie is HttpOnly, SameSite Strict, path `/api/auth`, Secure in production. Logout does not individually revoke already issued access JWTs; those may remain valid to expiry. Origin and throttle behavior are not optional user-interface validation.

**Proposed policy difference:** verified guest accounts will be mandatory for **new** reservations. Current optional-account and private-link APIs must remain safe for historical records during migration.

## 5. Documented room, amenity, image, and availability endpoints

A/M = currently documented ADMIN or MANAGER. Staff = ADMIN, MANAGER, RECEPTIONIST, with additional service-level limits.

| Method | Path | Purpose / access | Mapped source |
|---|---|---|---|
| GET | `/api/room-types` | Public active-category list | `backend/src/room-types/room-types.controller.ts` |
| GET | `/api/room-types/:id` | Public active-category detail | same |
| POST | `/api/room-types` | A/M create category with server validation | `room-types.controller.ts`, `room-types.service.ts` |
| PATCH | `/api/room-types/:id` | A/M edit category, capacity/rate/activity safeguards | same |
| GET | `/api/rooms` | Staff list physical rooms | `backend/src/rooms/rooms.controller.ts` |
| GET | `/api/rooms/:id` | Staff physical-room detail | same |
| POST | `/api/rooms` | A/M create physical room; defaults READY and active | `rooms.controller.ts`, `rooms.service.ts` |
| PATCH | `/api/rooms/:id` | A/M edit room metadata, **not status** | same |
| PATCH | `/api/rooms/:id/status` | Staff status transition, service-enforced role/status rules | `backend/src/rooms/room-status.controller.ts`, `room-status.service.ts` |
| GET | `/api/amenities` | Public amenity catalog | `backend/src/amenities/amenities.controller.ts` |
| POST | `/api/amenities` | A/M create amenity | same, `amenities.service.ts` |
| PATCH | `/api/amenities/:id` | A/M edit amenity | same |
| GET | `/api/room-types/:id/amenities` | Public category amenities | `backend/src/amenities/room-type-amenities.controller.ts` |
| POST | `/api/room-types/:id/amenities` | A/M attach amenity, 201 | same, `amenities.service.ts` |
| DELETE | `/api/room-types/:id/amenities/:amenityId` | A/M detach link, 204 | same |
| GET | `/api/room-types/:id/images` | Public active-category image metadata | `backend/src/room-images/room-images.controller.ts` |
| POST | `/api/room-types/:id/images` | A/M validated single-file multipart upload, 201 | same, `image-validation.service.ts`, `image-storage.service.ts` |
| PATCH | `/api/room-types/:id/images/:imageId` | A/M metadata/primary-image update | `room-images.controller.ts`, `room-images.service.ts` |
| DELETE | `/api/room-types/:id/images/:imageId` | A/M staged metadata/file removal, 204 | same, `image-storage.service.ts` |
| GET | `/api/room-images/:imageId/file` | Public controlled WebP binary, active category only | `room-images.controller.ts`, image storage service |
| GET | `/api/rooms/:id/blocks` | Staff maintenance-block history, includes cancelled rows | `backend/src/room-blocks/room-blocks.controller.ts` |
| POST | `/api/rooms/:id/blocks` | A/M create block; conflict/inventory checks | same, `room-blocks.service.ts` |
| PATCH | `/api/rooms/:id/blocks/:blockId` | A/M edit active block | same |
| POST | `/api/rooms/:id/blocks/:blockId/cancel` | A/M cancel block with `canceledAt`, never delete | same |
| GET | `/api/availability` | Public category availability and nightly quote, 30/min | `backend/src/availability/availability.controller.ts`, `availability.service.ts` |

**Important current details:**

- Public room-type fields: `id`, `name`, `description`, `capacity`, `baseRateCentavos`. No automatic private fields or image metadata in that response.
- Availability query uses `checkIn`, `checkOut`, `guests`; it validates Philippine dates and currently enforces a maximum 30-night search. Results include category `id`, `name`, `capacity`, `available`, `nights`, `nightlyRateCentavos`, and `totalAmountCentavos`. It is a quote/search, **not** an inventory reservation. The original calculator counts capacity across nights, not necessarily a feasible same-room assignment over the entire stay.
- Room-state service permits Receptionist READY ↔ CLEANING while other changes are restricted to Manager/Admin. This differs from Architecture v2.1's older reception view-only rule, so retain the discrepancy for review.
- `RoomStatus` includes `OCCUPIED`, but clients cannot directly set it through the status endpoint; stay operations own occupancy changes.
- Active room blocks use Philippine date intervals with inclusive start and exclusive end, reject conflicting commitments, and retain cancellation history.
- Image uploads: one file, max 5 MiB input, decoded JPEG/PNG/WebP, 20-million-pixel limit, normalized WebP, no original metadata. Do not expose internal file paths. A file-system operation and database write cannot be assumed perfectly atomic.
- The proposed hourly/weekly/monthly quotes, included-occupancy limits, extra-person charges, and entire-stay feasibility checks require separate approved contracts; they are not additional parameters currently proven on `/api/availability`.

## 6. Documented reservation and booking-access endpoints

The current `AGENTS.md` section C lists the following registered routes. Several use historical optional-account/auto-confirming property-booking behavior and will need a coordinated, explicitly approved cutover to the new policies.

| Method | Path | Purpose / access | Mapped source |
|---|---|---|---|
| POST | `/api/reservations/pay-at-property` | Public, allowed Origin, 5/min; historical immediately confirmed booking, 201 | `backend/src/reservations/reservations.controller.ts`, acquisition/validation services |
| POST | `/api/reservations/access/request` | Public, 3/min, allowed Origin; generic 202 email-link request | `backend/src/reservations/booking-access.controller.ts`, booking access/email services |
| POST | `/api/reservations/access/exchange` | Public, 5/min, allowed Origin; consume link, set private booking cookie | same |
| GET | `/api/reservations/access/current` | Scoped cookie, 30/min; private booking view | same, `booking-access.service.ts` |
| POST | `/api/reservations/access/logout` | Public, 10/min, allowed Origin; revoke private session, 204 | same |
| GET | `/api/reservations/access/payment-summary` | Scoped cookie, 30/min; limited payment summary | `booking-access.controller.ts` and `backend/src/payments/payment-summary.service.ts` (check current source) |
| GET | `/api/reservations/:reservationId/assignments` | Staff; assignment history | `backend/src/reservations/room-assignments.controller.ts` |
| POST | `/api/reservations/:reservationId/assignments` | Staff; assign an eligible physical room | same, `room-assignments.service.ts` |
| POST | `/api/reservations/:reservationId/assignments/:assignmentId/reassign` | Staff; release prior assignment and add replacement | same |
| POST | `/api/reservations/:reservationId/assignments/:assignmentId/release` | Staff; release assignment, preserve history | same |
| POST | `/api/reservations/lifecycle/expire-holds` | Staff; bounded cleanup, optional limit 1–100, counts/hasMore | `backend/src/reservations/reservation-lifecycle.controller.ts`, `reservation-lifecycle.service.ts` |
| POST | `/api/reservations/:reservationId/cancel` | Staff; reason 3–500 characters, existing unpaid policy | `backend/src/reservations/reservation-cancellation.controller.ts`, cancellation service |
| POST | `/api/reservations/:reservationId/check-in` | Staff; matching assignment, `identityVerified=true`, paid/READY checks | `backend/src/reservations/reservation-stay.controller.ts`, `reservation-stay.service.ts` |
| POST | `/api/reservations/:reservationId/check-out` | Staff; matching assignment, occupancy/payment safety | same |

**Original private-access contract:** `nexora_booking_access` is an HttpOnly, SameSite Strict cookie scoped to `/api/reservations/access` (Secure in production). Emailed tokens are single-use with a 15-minute expiry and verified through an explicit exchange. The resulting scoped session lasts 30 minutes. Never treat a booking number or email address alone as private authorization. Staff JWT, guest JWT, and booking-session cookie are not interchangeable.

**Current stay rules documented in AGENTS:** check-in verifies identity and exactly one active matching assignment, requires the READY room and adequate verified/recorded payment, then transitions reservation to CHECKED_IN and room to OCCUPIED; check-out transitions to CHECKED_OUT and CLEANING and releases assignment. Audit events and safe retry decisions are preserved. The proposed 30-minute grace, damage fees, deposits and late-arrival changes are not implied installed by these original routes.

### 6.1 Guest-booking redesign routes: documented isolated implementation, exact main registration not reverified

`AI_HANDOFF.md` lists these under `/api/reservations/access/guest-bookings`. Subsequent `AGENTS.md` reports transfer to main, but this reference does not replace inspection of `guest-bookings.controller.ts` in the current main source.

| Method | Path | Description / access | Documented source |
|---|---|---|---|
| POST | `/api/reservations/access/guest-bookings` | Create or replay booking; limited receipt and private cookie; Origin, DTO, throttle | `backend/src/reservations/guest-bookings.controller.ts`, `guest-booking.service.ts` |
| POST | `/api/reservations/access/guest-bookings/recover` | Recover original request with `requestId` and `recoveryToken` | same, `guest-booking-security.ts` |
| POST | `/api/reservations/access/guest-bookings/checkout/current` | Read pinned current attempt using session and `expectedReservationNumber` | same, `booking-access.service.ts` |
| POST | `/api/reservations/access/guest-bookings/checkout` | Prepare or replay checkout using booking session, expected number and request ID | same, `backend/src/payments/checkout.service.ts` |

The POST `/checkout/current` endpoint is **read-only in business effect despite using POST** because it validates a scoped request body. It still needs the same access and data-leakage checks as a private read.

**Redesign versus later-approved policy:** the isolated redesign implemented 15-minute online holds and initial staff-contact/24-hour response mechanics. The owner subsequently approved **two-hour online holds**, **mandatory verified guest accounts**, **five-hour cancellation eligibility after first confirmation**, and **financial-exception handling**. These newer business rules are **not proof that the isolated controllers already satisfy them**. Retire or transition the historical auto-confirming Pay at Property endpoint only after coordinated frontend, backend, data and regression review.

## 7. Documented payments and webhook endpoints

| Method | Path | Description / access | Mapped source |
|---|---|---|---|
| GET | `/api/payments/reservations/:reservationId/summary` | JWT: staff allowlist or linked guest ownership; private summary | `backend/src/payments/payments.controller.ts`, `payment-summary.service.ts` |
| GET | `/api/payments/reservations/:reservationId/checkout` | JWT and ownership, retrieve checkout status | `payments.controller.ts`, `checkout.service.ts` |
| POST | `/api/payments/reservations/:reservationId/checkout` | JWT/ownership, allowed Origin, 5/min; create/replay test checkout | same, `paymongo.adapter.ts` |
| GET | `/api/reservations/access/checkout` | Private booking cookie, 30/min; retrieve checkout state | `backend/src/reservations/booking-access.controller.ts` or delegated payment controller; inspect main route registration |
| POST | `/api/reservations/access/checkout` | Private booking cookie, Origin, 5/min; create/replay test checkout | same, `checkout.service.ts` |
| POST | `/api/webhooks/paymongo` | Provider signed raw JSON, 120/min, test-mode only | `backend/src/payments/webhooks.controller.ts`, `paymongo-webhook.signature.ts`, `paymongo-webhook.service.ts` |

### 7.1 Current summary behavior

Read-only summary fields documented in old `API.md`:

`reservationNumber`, `reservationStatus`, `currency`, `bookedTotalCentavos`, `collectedCentavos`, `refundedCentavos`, `pendingRefundCentavos`, `netPaidCentavos`, `balanceDueCentavos`, `overpaidCentavos`, `hasPendingPayment`, `status`, `requiresReview`.

Use `Cache-Control: no-store`. The accountless booking summary must derive the reservation from a valid scoped session, never a caller-supplied reference. A missing/inaccessible record is private 404. Ambiguous finances produce 409 or a review-required result according to existing service semantics.

### 7.2 Historical checkout contract

- POST accepts `requestId` as UUID v4. Amount, currency, supported payment methods and return URLs are backend-selected.
- State is `NONE`, `CREATING`, `READY`, `UNKNOWN`, and in the later webhook integration `PAID`; only READY exposes a validated PayMongo HTTPS checkout URL.
- A replayed request ID reuses the same attempt. A different ID while an attempt is outstanding is rejected/reviewed according to source behavior. The original attempt fingerprint and amount must remain consistent.
- These are historical implementation constraints, not authorization to change payment retries for the newly approved two-hour policy without coordinated service review.

### 7.3 Verified webhook contract

- Use **original raw body bytes** and `Paymongo-Signature`, with HMAC-SHA256 and the separate backend test webhook secret.
- Only approved **test-mode** `checkout_session.payment.paid` events settle funds; enforce matching local attempt/reference, provider IDs, `PHP`, exact positive integer centavos, and durable evidence.
- Accepted responses: HTTP 200 and `{data:{received:true,outcome}}`, where `outcome` is `PROCESSED`, `DUPLICATE`, `IGNORED`, or `REVIEW_REQUIRED`.
- Invalid signature: 401. Malformed/live callback: 400. Missing signing secret or failed durable commit: 503.
- Record signed mismatches durably for review before acknowledging them. Preserve late or timestamp-out-of-window evidence without treating it as payment success. Duplicate event IDs must never duplicate money or reservation confirmation.
- Provider return URL query strings are untrusted UI hints, not payment evidence.

### 7.4 Owner-approved payment policy requiring API design

- Online hold expires **two hours** after the backend-created reservation, with no app countdown and no automatic extension for retries.
- Multiple retries are permitted only while the reservation remains eligible and inventory holds remain active.
- After expiration, create a **new reservation after a new availability check**. Do not revive the old reservation.
- At expiry, distinguish confirmed unpaid from uncertain provider outcomes. Preserve provider evidence for reconciliation; do not misclassify an already successful payment as certainly unpaid.
- Verified duplicate/late/excess/failed-fulfillment payment corrections require **Super Admin approval and audit logging**, separate from the prohibition on voluntary paid-booking cancellation.
- A pending checkout may have an active provider session beyond the local hold; provider expiry and local cancellation must be coordinated without overriding valid provider evidence.

No route for these new financial review decisions is assigned yet. Avoid inventing an endpoint or a new refund method.

## 8. Proposed domains and route gaps, no invented endpoint paths

| Domain | Approved future capability | Current documentation limit | Candidate source boundary, **not verified** |
|---|---|---|---|
| Guest account / ownership | New reservations require registered, verified guests; historical accountless access remains protected | Auth exists; reworked booking authorization not yet verified | Existing `auth/`, `reservations/`, `common/ownership/` |
| Super Admin / staff accounts | Five-role RBAC, staff password reset and must-change password | No final user-management endpoint inventory in uploaded API | New or existing user administration module, location TBD |
| Progressive login lockout | 1, 5, 15, 30 minute steps; reset on success or after one hour | No installed route contract changes shown | Existing `auth/` services |
| Rental pricing | Hourly 3–11 PM, nightly, weekly 7 days, monthly 30 days; backend quotes and extra occupants | Current availability only accepts nightly dates/guest count | Existing `availability/`, `room-types/`, `reservations/` |
| Staff Pay at Property approval | First explicit staff confirmation starts five-hour cancellation window; later calls cannot reset | Existing auto-confirm endpoint conflicts with approved requirement | Existing reservation/lifecycle boundaries, route TBD |
| Contact and reminder records | One-week, one-day, shorter-notice outreach | No installed HTTP route shown | Reservations / notifications, TBD |
| Cancellation | Eligible unpaid guest cancellation within five hours; paid voluntary cancellation denied | Current staff-only unpaid cancel differs | Existing cancellation service, route and access revision TBD |
| No-shows | Unpaid 1-hour late auto-cancel with inventory release; paid guest not auto-cancelled | No final installed owner-policy endpoint shown | Reservation lifecycle service, TBD |
| Charges / deposits | Record damage, late checkout, extra guest fees; manager+ approval; optional deposits | No installed charge/deposit endpoints evidenced | New focused services after schema review, TBD |
| Payment corrections | Super Admin review for duplicate/late/overpayments and failed fulfillment | No signed-off write endpoints evidenced | Existing payment/refund/audit boundaries, TBD |
| Reports / dashboard | Authorized operational financial and booking views | Older `API.md` says not registered; later owner progress claims phases complete without exact route list | Inspect installed controllers first |
| Settings / audit | Super Admin-only audit reads and system settings | Exact current paths and 5-role permissions not verified | Source mapping TBD |
| NFC | Placeholder only | No hardware API authorized | **DEFERRED**, no route design |

**Do not promote path examples from Architecture v2.1 or screen prototypes into verified API endpoints.** Every new path needs explicit method, DTO, authentication, role/ownership, errors, side effects, tests and owner approval.

## 9. Mutating side-effects checklist for every documented POST, PATCH, DELETE route

This section is a route-by-route **review checklist**, not a claim that each check has passed. Before editing a route, verify the current controller/service and its actual database side effects. For POST routes that primarily read, record that distinction explicitly. No HTTP GET is intended to mutate application state, except the documented `verify-email` GET which *currently consumes a credential and activates an account* and must be evaluated for email-link prefetch safety.

**Checklist key:** **A** actor/authorization; **V** validated input and invariant; **T** transaction/atomicity where needed; **I** idempotency/repeat behavior; **H** history/audit; **X** external side effects; **P** projection/privacy.

### 9.1 Auth and session mutations

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /auth/register` | **A,V,T,I,X,P:** Normalize email, server-assign GUEST, hash password, create pending User + linked Guest + verification hash atomically; avoid duplicate-email enumeration; deliver mail only after commit; never expose token/hash. |
| `POST /auth/resend-verification` | **A,V,I,X,P:** Eligibility and throttling, issue/reuse verification safely, generic response, send email without exposing account existence; verify token supersession policy. |
| `POST /auth/login` | **A,V,T,I,P:** Verify Argon2id, status and role from DB; create hashed refresh family/cookie. **PROPOSED:** update failure counts and lockout safely, clear counter on successful login. Never reveal why credentials failed. |
| `POST /auth/refresh` | **A,V,T,I,P:** Rotate/consume old refresh record atomically, reject replay and revoke compromised family, set new cookie only on successful trusted session. |
| `POST /auth/logout` | **A,T,I,P:** Revoke identified refresh family, clear cookie with matching options, preserve independent sessions; do not falsely claim existing 15-minute JWT is revoked immediately. |

**Special non-POST side effect:** `GET /auth/verify-email` consumes a verification token and activates the user transactionally. Protect against unsolicited link-scanner/prefetch activation before any approved change in HTTP semantics.

### 9.2 Room and amenity mutations

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /room-types` | **A,V,T,I,P:** Create category with normalized unique name, positive capacity/rate and safe response. |
| `PATCH /room-types/:id` | **A,V,T,H,P:** Preserve existing reservation rate snapshots; capacity reduction/deactivation must not strand protected committed inventory; record actor if required by approved audit policy. |
| `POST /rooms` | **A,V,T,I,P:** Validate unique room number, valid room type, initially READY/active; check single-property scope. |
| `PATCH /rooms/:id` | **A,V,T,H,P:** Protect future assignments and committed inventory during reclassification/deactivation; reject operational status fields on this route. |
| `PATCH /rooms/:id/status` | **A,V,T,H,P:** Only authorized transition graph; reception READY/CLEANING exception under review; never manually set OCCUPIED. |
| `POST /amenities` | **A,V,T,I,P:** Create normalized unique amenity; reject duplicates. |
| `PATCH /amenities/:id` | **A,V,T,P:** Validate updated name/description and collisions. |
| `POST /room-types/:id/amenities` | **A,V,T,I,P:** Validate active category and amenity, create single link, avoid duplicate relations. |
| `DELETE /room-types/:id/amenities/:amenityId` | **A,V,T,I,H:** Remove only the association, not amenity catalog or historical reservations; define repeat-delete behavior. |

### 9.3 Image and room-block mutations

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /room-types/:id/images` | **A,V,T,X,P:** Byte/type/pixel/size validation; re-encode to WebP, safe generated filename, persist metadata, choose first primary. Handle file/database partial failure and cleanup. |
| `PATCH /room-types/:id/images/:imageId` | **A,V,T,I,P:** Edit metadata/display order; selecting primary must preserve at most one primary per type; reject invalid false primary operation per existing service contract. |
| `DELETE /room-types/:id/images/:imageId` | **A,V,T,X,H:** Staged image record/file removal; primary fallback; avoid deleting unrelated paths; recovery plan for storage/DB divergence. |
| `POST /rooms/:id/blocks` | **A,V,T,H:** Validate dates/reason and room activity; reject overlap with blocks and committed assignments in one transaction. |
| `PATCH /rooms/:id/blocks/:blockId` | **A,V,T,H:** Edit only active block; reevaluate inventory conflict under write transaction; preserve cancelled history. |
| `POST /rooms/:id/blocks/:blockId/cancel` | **A,V,T,I,H:** Set `canceledAt` once, preserve row; repeated cancellation currently conflicts; update availability consistently. |

### 9.4 Reservation and booking-access mutations

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /reservations/pay-at-property` | **A,V,T,I,H,P:** Historical route creates immediately confirmed booking. **Must be retired/changed in coordinated revision** to pending staff contact; protect inventory and previous records during transition. |
| `POST /reservations/access/request` | **A,V,I,X,P:** Generic 202 to prevent enumeration; validated reference/email matching, hashed one-time link with resend spacing, SMTP after safe persistence, no secrets in response. |
| `POST /reservations/access/exchange` | **A,V,T,I,P:** Validate and consume one-time link, create hashed private session, issue scoped cookie, no repeat consumption or guest-data leaks. |
| `POST /reservations/access/logout` | **A,T,I,P:** Revoke only current booking session, clear cookie, do not revoke unrelated users' sessions. |
| `POST /reservations/:reservationId/assignments` | **A,V,T,I,H:** Staff permission, eligible confirmed reservation, full-stay room feasibility, one active assignment, audited inventory-safe write. |
| `POST /reservations/:reservationId/assignments/:assignmentId/reassign` | **A,V,T,I,H:** Release previous assignment and insert replacement atomically, preserve history, no room overlap. |
| `POST /reservations/:reservationId/assignments/:assignmentId/release` | **A,V,T,I,H:** Mark `releasedAt`, preserve reservation inventory commitment and historical row, safe repeat behavior. |
| `POST /reservations/lifecycle/expire-holds` | **A,V,T,I,H:** Bounded cleanup (`1..100`), expire only eligible pending holds, release assignments, audit once. **PROPOSED:** reconcile uncertain provider payment before inventory release. |
| `POST /reservations/:reservationId/cancel` | **A,V,T,I,H:** Current staff-only no-payment cancellation; normalized reason, preserve rows, release assignment/inventory, audit once. **PROPOSED:** five-hour eligible guest cancellation and paid-booking prohibition require new rules. |
| `POST /reservations/:reservationId/check-in` | **A,V,T,I,H:** Confirm identity, assignment, allowed date, READY room, adequate verified payment; atomic CHECKED_IN and OCCUPIED transition, audit. |
| `POST /reservations/:reservationId/check-out` | **A,V,T,I,H:** Confirm assignment, occupancy, payment and card constraints; atomic CHECKED_OUT, CLEANING and assignment release; record once and audit. **PROPOSED:** grace/charges/deposit settlement. |

### 9.5 Isolated guest-booking redesign POST routes

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /reservations/access/guest-bookings` | **A,V,T,I,H,P:** Create or replay one pending booking using pinned request identity and recovery context, acquire inventory safely, set scoped cookie, avoid duplicate Guest/Reservation/Attempt creation. **PROPOSED:** mandatory verified account and two-hour hold require review. |
| `POST /reservations/access/guest-bookings/recover` | **A,V,I,P:** Validate requestId and recoveryToken, recover exactly the original attempt; never broaden booking scope or disclose guest details. |
| `POST /reservations/access/guest-bookings/checkout/current` | **A,V,I,P:** **Read-only operation using POST**; validate expected reservation and session scope, return bounded current state, no payment or inventory write. |
| `POST /reservations/access/guest-bookings/checkout` | **A,V,T,I,X,P:** Validate pinned booking/hold, request ID, current price and payment eligibility, create/replay authorized PayMongo test checkout. External provider work outside DB transaction. |

### 9.6 PayMongo checkout and webhook POST routes

| Route | Expected side effect and mandatory review checks |
|---|---|
| `POST /payments/reservations/:reservationId/checkout` | **A,V,T,I,X,P:** JWT plus ownership, allowed Origin, server-derived amount/currency, provider test credentials, requestId replay; no browser-supplied price/status; provider uncertainty retained. |
| `POST /reservations/access/checkout` | **A,V,T,I,X,P:** Same checkout safety using valid booking-session cookie, no scope escalation. |
| `POST /webhooks/paymongo` | **A,V,T,I,H,X,P:** Original raw signature, verified test mode, exact provider/amount/currency association, event ID dedup, atomic receipt and applicable reservation effects, durable mismatch review before 200. No browser Origin requirement. |

### 9.7 PATCH/DELETE inventory completeness check

All documented PATCH and DELETE routes in Sections 5 and 9 are accounted for above. When current source reveals additional registered mutating paths, append a separate line to this table before changing them. **Do not claim an exhaustive current-runtime inventory** until controller decorators have been inspected in the actual repository. Proposed Super Admin, staff collections, deposit, reminders, charge, settings and report writes have no agreed method/path yet; require a separate contract and side-effect checklist before implementation.

## 10. Error handling, caching, idempotency, and consistency

### 10.1 Response and caching conventions

- Existing JSON success responses vary by module; preserve established envelopes until a separately approved API version migration.
- JWT, booking-access, payment and provider status responses use `Cache-Control: no-store` where specified. Public file images may return public max-age 300.
- Private reads return only role/ownership-scoped fields. Use `Vary: Authorization, Origin` or `Vary: Cookie, Origin` where documented.
- Do not cache payment success or availability as authoritative frontend state. Recheck availability and backend pricing at creation/confirmation.
- Pagination is **not** established as a shared current contract; decide parameters and projection before adding admin list endpoints.

### 10.2 Retry and idempotency

- Replaying a checkout with a stored UUID requestId is distinct from submitting a new request while an earlier provider outcome is unresolved.
- Guest booking redesign has request/recovery identifiers and a private session. Retain original IDs across network ambiguity instead of silently creating a second reservation.
- PayMongo webhook event dedup is separate from client-request idempotency.
- Every payment or inventory mutation must be safe against concurrent calls and process retries.
- The old `API.md` statement that generic `Idempotency-Key` was unimplemented was historical; do not add a global header by assumption. Use verified route-specific contracts.

### 10.3 Transaction rules

- Check and acquire inventory in the same protected DB transaction, with safe SQLite conflict/retry behavior.
- Make reservation state, assignments and corresponding audit effects atomic where required.
- Make verified payment receipt, provider-event record, reconciliation status and eligible reservation confirmation consistent.
- No external PayMongo or SMTP request inside a Prisma transaction.
- Do not erase or rewrite history to simplify retries or financial corrections.
- Preserve separate `ReservationStatus`, `PaymentStatus`, operational `RoomStatus` and checkout attempt states.

## 11. Known issues and maintenance risks

| Issue | Documented evidence / impact | Required maintenance approach |
|---|---|---|
| **Stale API introduction** | Uploaded `API.md` says Phase 7 in progress; later `AGENTS.md` reports completed | Update statuses without inventing uninspected routes |
| **Source transfer gap** | `AI_HANDOFF.md` maps isolated guest booking sources; later `AGENTS.md` owner-reports transfer | Confirm main controllers and route decorators before declaring each current path |
| **15-minute versus 2-hour hold** | Existing/isolated behavior differs from newly approved 2-hour policy | Plan state, provider-expiration, worker and test revisions together |
| **Optional versus mandatory account** | Existing accountless checkout vs approved verified-account requirement | Preserve legacy booking access and do staged cutover |
| **Auto-confirm Pay at Property versus staff approval** | Existing route and new pending-confirmation workflow conflict | Coordinate frontend/backend cutover and preserve existing records |
| **24-hour staff response vs five-hour guest cancellation** | Distinct clocks, but earlier isolated policy differs from later owner decision | Explicitly model staff-response deadline and guest cancellation start separately; do not conflate |
| **Payment outcome uncertainty** | Local timeout and provider success may cross | Durable reconciliation before treating outcome as unpaid; never revive closed booking automatically |
| **Room readiness authority discrepancy** | Reception status transitions differ from baseline architecture table | Owner reconcile without silently changing permissions |
| **Availability continuity** | Date-per-night count may not prove one physical room is free across entire stay | Booking writer must guarantee whole-stay feasibility and transaction safety |
| **JWT logout limitation** | Access token persists until expiry unless account status changes | Document behavior, consider future revocation only with approval |
| **Email-link GET side effect** | `/auth/verify-email` consumes token on GET; prefetch risk noted | Evaluate explicit user confirmation, separate approved API change |
| **Runtime vs Prisma CLI DB target** | Two independently configured DB paths | Verify before any test/migration, avoid `dev.db` |
| **Deadline-worker gap** | Main dev.db worker not approved/enabled, test DB guard | Do not imply automatic expiry works in main until verified and authorized |
| **Sample contact data** | Guest Contact page contains intentional fictional contact values | Preserve visible sample label and disabled real-contact actions |
| **NFC postponed** | Schema foundation exists, no hardware integration | No issuance/access API or simulated access success |
| **Old status/error envelopes** | Inconsistent existing response shapes and no uniform custom exception filter | Preserve clients, approve changes as a versioned contract |
| **Incomplete staff API inventory** | Older API says operations absent; later phase completion not accompanied by exact paths in attached API | Inspect source; don't infer routes from UI navigation or DB models |
| **External integration verification** | Historic owner-reported test results do not establish current PayMongo delivery or SMTP acceptance | Separate isolated signed-webhook, browser and delivery verification |

## 12. API maintenance and approval rules

1. **Read first:** relevant `AGENTS.md`, architecture, `API.md`, `SECURITY.md`, `DATABASE_SCHEMA.md`, `BUSINESS_FLOWS.md`, actual controller, DTO and service.
2. **Route evidence:** before registering any path as implemented, inspect its controller decorator in current main source and linked module registration. Record exact controller/service file paths.
3. **Contract proposal:** for each new route document method, path, actor/ownership, DTO, response projection, status/errors, rate limit, Origin/cookie/header needs, side effects and idempotency.
4. **Schema compatibility:** verify current Prisma schema and migrations. Database fields proposed in the approved technical plan are not installed merely because they are documented.
5. **Security first:** enforce permissions, ownership, validation and data minimization on the server. Super Admin audit and financial permissions require explicit revised role guards.
6. **Financial integrity:** never trust frontend prices, success redirects, unsigned callbacks or non-PHP amount assumptions. Keep provider test credentials backend-only.
7. **Historical integrity:** never overwrite, reprice, delete or revive committed reservations to avoid handling state transitions properly.
8. **Testing:** use disposable test databases and fixtures; include allowed/denied role, ownership 404, concurrent inventory, duplicate payment callback, retries, expired hold, uncertain provider, validation, and failure rollback.
9. **Documentation updates:** replace only the approved section and preserve unrelated content, with source/date/status evidence. Mark owner-reported versus independently verified checks.
10. **Authorization:** conceptual planning and this proposed Markdown draft do not grant code implementation rights. Require scoped **`EggPie`** before implementation code or source changes; require explicit approval before replacing existing project documentation. Never run migrations, tests, installs, provider calls, commits, pushes or deployment without applicable authorization.

## 13. Unresolved API contract decisions

| Decision | Required before |
|---|---|
| Exact current main-controller inventory, especially Phase 7 later payment and guest redesign | Declaring route completeness |
| Exact `.env.example` keys for JWT/CORS/SMTP/Vite | Publishing full environment reference |
| Revised five-role permission mapping and Super Admin seed/safeguards | Staff/financial endpoints |
| Verified-account cutover for booking creation with historical guest access | Booking/API authorization changes |
| Final hourly stay clock interval and overnight checkout time | Availability/rental quote DTOs |
| Backend 2-hour hold expiration semantics including uncertainty | Reservation creation, retry and worker logic |
| Provider-session expiration/reconciliation strategy | Payment retry and refund paths |
| Five-hour cancellation eligibility for guests and independent staff response deadlines | Cancellation and staff confirmation contracts |
| Same-day arrival contact and unpaid no-show timing | Reception/notification endpoints |
| Exact charge/deposit ledger and partial-hour rounding | Financial writes |
| Discount approval rights | Pricing/discount endpoint |
| Notification delivery and retry guarantees | Notification writes |
| Shared list pagination/search/filter shape | New admin list endpoints |
| Future public policy/contact data projection | Guest site public APIs |
| Production routing, HTTPS and PostgreSQL | Deployment, explicitly out of local prototype scope |

---

### Sources consulted

- `API.md` (uploaded existing API reference, including Phase 7.2 and 7.3 appended contracts)
- `AGENTS.md` (latest owner development checkpoint and Section C registered reservation routes)
- `AI_HANDOFF.md` (guest-booking redesign and isolated/main source boundaries)
- `DIRECTORY_STRUCTURE.md` (documented controller and service mappings)
- `SECURITY.md` (JWT, roles, ownership, signature and cookie requirements)
- `NEXORA_ARCHITECTURE_V2.1.md` (approved baseline)
- `BUSINESS_FLOWS.md` (business-flow baseline)
- `TECHNICAL_PLAN_APPROVED.md` (approved forward technical plan)

**Draft disposition:** proposed standalone replacement copy. Existing `API.md` unchanged. Endpoint implementation, tests and runtime configuration not independently verified in this documentation session.
