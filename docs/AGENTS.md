# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-11-01. Paths are relative to D:\Web-JSX\NEXORA.
**Current checkpoint:** Phases 1–6 are COMPLETED per owner confirmation,
including Phase 3 (8/8), Phase 4 (7/7), Phase 5 (7/7) and Phase 6 (10/10).
**Next phase:** Phase 7 — Payment System, NOT STARTED / AWAITING APPROVAL.
Review the existing reservation/payment boundaries and approve the Phase 7
step plan before implementing payment collection, hosted checkout or webhooks.

## A. Project Identity and Architecture

- NEXORA is a Condotel Management System for one property, built as a modular
  monolith. Separate guest and admin frontends share one NestJS REST API.
- [docs/NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md)
  is the authoritative architecture. Preserve its scope, business requirements,
  KISS principle, and twelve-phase sequence. Project documentation lives in
  docs/; only README.md remains at the repository root. The checkpoint above
  supersedes older progress descriptions
  in supporting documents; it does not change architecture requirements.
- Both frontends use React, JavaScript/JSX, Vite, React Router, Axios, plain CSS,
  and Lucide React. Frontends communicate through the API, never directly with
  the database. Installed @types packages do not authorize frontend TypeScript.
- Backend: Node.js, NestJS/Express, TypeScript, ESM, Prisma, DTO validation,
  JWT/Passport, Argon2id, and explicit role/ownership enforcement.
- SQLite is used for development. PostgreSQL is recommended for production,
  subject to the production decision and separate migration verification.
- Guest accounts remain optional. Accountless Pay at Property checkout and
  private email-link booking access are implemented. A booking number alone is
  not private authorization. Existing account holders can use the same email
  access flow; automatic User/Guest linking and a JWT booking-list API are not
  established by the inspected checkout. Payment processing and NFC remain future work.
- Never publish real .env contents, credentials, raw tokens, password hashes,
  private guest records, database contents, or NFC cryptographic material.

## B. Installed Dependencies and Exact Versions

Snapshot reverified on 2026-11-01 against each package.json, package-lock.json,
and node_modules/<package>/package.json. All 62 direct workspace entries have
matching installed and locked versions. There is no root package.json or
additional npm workspace manifest. Shared packages count once per application;
transitive packages are deliberately excluded from these direct tables.

**Verified local tools:** Node.js 24.20.0; npm 11.19.0. These are observed local
versions, not an unverified claim about every developer or production host.
Prisma CLI (prisma) and Prisma Client (@prisma/client) are separately verified
at 7.10.1, as is the SQLite adapter. NestJS common/core/platform-express/testing
are 12.2.0; individual NestJS extension/CLI versions differ as listed below.

The Exact Installed Version column contains exact versions. Requested versions
are separate manifest constraints and do not establish what is installed.

### Backend — dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| @nestjs/common | 12.2.0 | NestJS decorators, validation plumbing, and HTTP exceptions | Runtime | ^12.0.1 |
| @nestjs/core | 12.2.0 | NestJS application core and dependency injection | Runtime | ^12.0.1 |
| @nestjs/jwt | 12.0.3 | JWT signing and verification | Runtime | ^12.0.3 |
| @nestjs/passport | 12.0.0 | NestJS Passport integration | Runtime | ^12.0.0 |
| @nestjs/platform-express | 12.2.0 | Express adapter and upload interceptors | Runtime | ^12.0.1 |
| @nestjs/throttler | 6.7.1 | Request throttling | Runtime | ^6.7.1 |
| @prisma/adapter-better-sqlite3 | 7.10.1 | Prisma SQLite driver adapter | Runtime | ^7.10.1 |
| @prisma/client | 7.10.1 | Prisma client runtime | Runtime | ^7.10.1 |
| argon2 | 0.45.1 | Argon2id password hashing | Runtime | ^0.45.1 |
| class-transformer | 0.5.1 | DTO transformation | Runtime | ^0.5.1 |
| class-validator | 0.15.1 | DTO validation | Runtime | ^0.15.1 |
| cookie-parser | 1.4.7 | Refresh-cookie parsing | Runtime | ^1.4.7 |
| dotenv | 18.0.9 | Backend environment loading | Runtime | ^18.0.9 |
| multer | 2.5.0 | Multipart upload handling | Runtime | 2.5.0 |
| nodemailer | 10.3.1 | SMTP verification email delivery | Runtime | ^10.3.1 |
| passport | 0.7.0 | Authentication framework | Runtime | ^0.7.0 |
| passport-jwt | 4.0.1 | Bearer JWT strategy | Runtime | ^4.0.1 |
| reflect-metadata | 0.2.2 | Decorator metadata | Runtime | ^0.2.2 |
| rxjs | 7.8.2 | Reactive primitives used by NestJS | Runtime | ^7.8.1 |
| sharp | 0.35.5 | Decode, validate, and re-encode images | Runtime | ^0.35.5 |

### Backend — development dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| @nestjs/cli | 12.0.10 | NestJS build/development CLI | Development | ^12.0.0 |
| @nestjs/schematics | 12.0.10 | NestJS code generators | Development | ^12.0.0 |
| @nestjs/testing | 12.2.0 | NestJS test modules | Development | ^12.0.1 |
| @types/better-sqlite3 | 9.6.0 | Type declarations for better-sqlite3 | Development | ^9.6.0 |
| @types/cookie-parser | 1.4.10 | Type declarations for cookie-parser | Development | ^1.4.10 |
| @types/express | 5.0.6 | Type declarations for express | Development | ^5.0.0 |
| @types/multer | 2.3.0 | Type declarations for multer | Development | ^2.3.0 |
| @types/node | 24.19.2 | Type declarations for node | Development | ^24.0.0 |
| @types/nodemailer | 8.0.2 | Type declarations for nodemailer | Development | ^8.0.2 |
| @types/passport | 1.0.17 | Type declarations for passport | Development | ^1.0.17 |
| @types/passport-jwt | 4.0.1 | Type declarations for passport-jwt | Development | ^4.0.1 |
| @types/supertest | 7.2.1 | Type declarations for supertest | Development | ^7.0.0 |
| @vitest/coverage-v8 | 4.1.12 | V8 test coverage provider | Development | ^4.1.2 |
| oxlint | 1.89.0 | JavaScript/TypeScript linting | Development | ^1.58.0 |
| oxlint-tsgolint | 7.0.2005 | Type-aware lint support | Development | ^7.0.2001 |
| prettier | 3.9.10 | Source formatting | Development | ^3.4.2 |
| prisma | 7.10.1 | Prisma CLI/schema and migration tools | Development | ^7.10.1 |
| source-map-support | 0.5.21 | Mapped runtime stack traces | Development | ^0.5.21 |
| supertest | 7.3.1 | HTTP integration testing | Development | ^7.0.0 |
| typescript | 6.0.3 | Backend TypeScript compiler | Development | ^6.0.2 |
| vite | 8.3.5 | Frontend bundler and Vitest build infrastructure | Development | ^8.0.0 |
| vitest | 4.1.12 | Backend test runner | Development | ^4.1.2 |

### Guest frontend — dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| axios | 1.20.0 | Frontend HTTP client | Runtime | ^1.20.0 |
| lucide-react | 1.61.0 | React icon components | Runtime | ^1.61.0 |
| react | 19.3.1 | React UI framework | Runtime | ^19.3.1 |
| react-dom | 19.3.1 | React browser renderer | Runtime | ^19.3.1 |
| react-router | 8.5.0 | Frontend routing | Runtime | ^8.5.0 |

### Guest frontend — development dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| @types/react | 19.3.0 | Type declarations for react | Development | ^19.3.0 |
| @types/react-dom | 19.3.0 | Type declarations for react-dom | Development | ^19.3.0 |
| @vitejs/plugin-react | 6.1.2 | React integration for Vite | Development | ^6.1.2 |
| oxlint | 1.89.0 | JavaScript/TypeScript linting | Development | ^1.88.0 |
| vite | 8.3.5 | Frontend bundler and Vitest build infrastructure | Development | ^8.3.4 |

### Admin frontend — dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| axios | 1.20.0 | Frontend HTTP client | Runtime | ^1.20.0 |
| lucide-react | 1.61.0 | React icon components | Runtime | ^1.61.0 |
| react | 19.3.1 | React UI framework | Runtime | ^19.3.1 |
| react-dom | 19.3.1 | React browser renderer | Runtime | ^19.3.1 |
| react-router | 8.5.0 | Frontend routing | Runtime | ^8.5.0 |

### Admin frontend — development dependencies

| Package | Exact Installed Version | Purpose | Dependency Type | Requested in package.json |
|---|---|---|---|---|
| @types/react | 19.3.0 | Type declarations for react | Development | ^19.3.0 |
| @types/react-dom | 19.3.0 | Type declarations for react-dom | Development | ^19.3.0 |
| @vitejs/plugin-react | 6.1.2 | React integration for Vite | Development | ^6.1.2 |
| oxlint | 1.89.0 | JavaScript/TypeScript linting | Development | ^1.88.0 |
| vite | 8.3.5 | Frontend bundler and Vitest build infrastructure | Development | ^8.3.4 |

**Inventory totals:** Backend: 42 (20 runtime + 22 development); Guest frontend: 10 (5 runtime + 5 development); Admin frontend: 10 (5 runtime + 5 development). Total: 62 verified direct entries.

Backend override: multer = 2.5.0. Multer is also a direct runtime dependency;
@types/multer and sharp support the room-image module. The current manifests retain the same 62 direct entries; this update verifies
installed versions rather than recording new installations.

Reproduce from each application's directory in PowerShell:

```powershell
node --version
npm --version
npm ls --depth=0
```

Compare installed metadata with that application's lockfile. Do not run npm
install merely to inspect versions. package.json ranges alone are insufficient.

## C. Completed Project Phases

Completion is owner-confirmed. Source and package metadata were inspected for
this update; application tests, builds, lint, browser checks, migrations, seeds,
and SMTP delivery were not executed. No new test pass count is claimed.

| Phase | Status | Delivered scope |
|---|---|---|
| 1 — Project Foundation | COMPLETED | Separate React applications, NestJS backend, API connectivity and project configuration |
| 2 — Database Foundation | COMPLETED | Prisma/SQLite schema, migrations, relationships, guarded seed and integrity-test foundation |
| 3 — Authentication & RBAC | COMPLETED — 8/8 | Accounts, secure sessions, explicit roles, ownership and email verification |
| 4 — Room Management | COMPLETED — 7/7 | Room types, physical rooms, amenities, images, rates/capacity, operational states, blocks and eligibility helpers |
| 5 — Guest Website | COMPLETED — 7/7 | Homepage, room browsing/details, integrated availability search, server-priced stay display, feedback and responsive/keyboard work |
| 6 — Reservation System | COMPLETED — 10/10 | Registered reservation API, guest checkout/private access, assignment history, lifecycle/expiration, cancellation, staff stays and accepted regression work |
| 7–12 | NOT STARTED / AWAITING APPROVAL | Payments; admin operations; NFC; reports/settings; integrated testing/security; deployment |

### Phase 1 — Project Foundation

- [x] Separate guest/admin React/Vite applications with layouts and routing.
- [x] NestJS API, public GET /api/health, /api prefix and Axios connectivity.
- [x] Package scripts, styles, environment templates and documentation foundation.

### Phase 2 — Database Foundation

- [x] Prisma models, relationships, CUID identifiers and initial migration.
- [x] Integer-centavo money, Philippine stay-date semantics and UTC event timestamps.
- [x] NestJS database provider, guarded seed and isolated integrity-test foundation.
- [x] Original 23 core models plus RoomTypeAmenity established 24 models;
  EmailVerificationToken subsequently brought the current total to 25.

### Phase 3 — Authentication & RBAC (8/8)

- [x] Step 1 — Account and session contracts.
- [x] Step 2 — Argon2id password hashing and verification.
- [x] Step 3 — ACTIVE-only login, JWTs, refresh rotation and replay protection.
- [x] Step 4 — Logout and refresh-family revocation.
- [x] Step 5 — Global JWT and explicit role guards.
- [x] Step 6 — Guest/reservation ownership helpers and staff allowlists.
- [x] Step 7 — Optional registration, email verification and resend.
- [x] Step 8 — Authentication/security testing accepted by the owner.

The historical 23/23 acceptance result remains owner-reported. It is not a new
execution result or the case count of the HTTP test file.

### Phase 4 — Room Management (7/7)

- [x] Step 1 — Room-type management.
- [x] Step 2 — Physical-room management.
- [x] Step 3 — Amenities and room-type links.
- [x] Step 4 — Validated image upload, WebP storage, primary-image management
  and controlled public delivery.
- [x] Step 5 — Rate/capacity validation and preservation of booking price snapshots.
- [x] Step 6 — Operational room states and dated room blocks with cancellation history.
- [x] Step 7 — Reusable inventory eligibility checks and accepted regression work.

InventorySafetyService checks physical-room eligibility and reserves nothing.
Future assignment writers must use assertEligibleInTx with their write in the
same transaction. Existing PENDING-assignment checks are conservative and do
not filter hold expiry. Phase 6 adds transactional acquisition, commitment
protection, public Pay at Property checkout and registered staff reservation
operations. Its expiration helper now releases expired-hold assignments and
records audit history; see the Phase 6 section below.

### Phase 5 — Guest Website (7/7)

- [x] Step 1 — Shared guest layout: navigation, backend status, outlet, footer,
  skip link and shared styles.
- [x] Step 2 — Homepage with NEXORA information and room-browsing links.
- [x] Step 3 — Connected room listing/detail routes, images and amenities.
- [x] Step 4 — Date and capacity search: Rooms.jsx calls availabilityApi.js,
  which requests GET /api/availability with checkIn, checkOut and guests.
  Input checks, request cancellation, stale-result reset and result feedback
  are present in the routed page.
- [x] Step 5 — Backend-calculated pricing display: search results show nights,
  nightlyRateCentavos and totalAmountCentavos using formatPesos. The browser
  displays the quote; AvailabilityService calculates trusted prices.
- [x] Step 6 — Loading, empty and failure states: room-list/detail retries,
  not-found handling, optional photo/amenity fallbacks, search errors and
  no-match/unavailable results.
- [x] Step 7 — Responsive and keyboard work: mobile menu, labels and ARIA state,
  skip link, route-change focus, Escape-to-close menu behavior, visible focus,
  responsive rules and reduced-motion styling. Overall completion is accepted
  from the owner; no fresh device/browser acceptance run is claimed here.

Public guest routes remain /, /rooms and /rooms/:id. Availability is
informational: search creates neither a hold nor a booking, and nightly
room-type capacity does not prove one physical room covers an entire stay.
No permanent availability test file or frontend test script was found in the
inspected locations. This is a coverage limitation, not a reversal of the
owner's Phase 5 completion. Historical sandbox diagnostics are not current
build/lint results; future verification must record actual command outcomes.

### Phase 6 — Reservation System (Completed — 10/10)

The owner's latest Phase 6 completion supersedes the earlier 2/10 checkpoint
and Step 6.3 pending-verification handoff. The ten-step sequence is retained
from [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md#8-phase-06--reservation-system).
Its historical status text and other supporting documents are not synchronized
by this AGENTS.md-only update.

| Step | Development task | Status / implemented scope |
|---|---|---|
| 6.1 | Booking policies and hold duration | COMPLETED — 15-minute hold, safely available Pay at Property confirmation, optional registration and trusted snapshots |
| 6.2 | Reservation date and capacity validation | COMPLETED — DTO/service validation of Philippine dates, active type/property, guests, rates and stay bounds |
| 6.3 | Concurrency-safe inventory acquisition | COMPLETED — serialized SQLite acquisition, bounded retry, whole-stay allocation, rollback and protection of existing commitments |
| 6.4 | Guest checkout and booking forms | COMPLETED — routed React/JSX checkout, selected stay details, current backend quote, guest form and confirmed booking receipt |
| 6.5 | Private booking access | COMPLETED — emailed single-use link, scoped cookie session, private booking view and logout |
| 6.6 | Physical-room assignment history | COMPLETED — staff assignment/reassignment/release, historical records, inventory checks and audit events |
| 6.7 | Reservation lifecycle transitions | COMPLETED — transition rules and bounded audited hold expiration with assignment release; action-specific writers enforce transitions |
| 6.8 | Reservation cancellation | COMPLETED — staff-authorized unpaid cancellation, inventory release, audit history and safe repeated cancellation |
| 6.9 | Staff check-in and check-out | COMPLETED — identity/assignment/date/room checks, full recorded-payment eligibility, operational room transitions and audited retries |
| 6.10 | Competing-booking and hold-expiration testing | COMPLETED per owner acceptance — permanent acquisition, protection, HTTP feature and cross-workflow journey suites inspected; not rerun here |

#### Booking policies and current operational limits

- PayMongo-style holds last 15 minutes in the acquisition foundation; no public
  PayMongo payment flow exists yet. Expired holds stop reducing searchable
  inventory immediately, independently of persisted cleanup status.
- Pay at Property booking creates CONFIRMED inventory commitments without
  recording payment. Prices are recalculated by the backend at creation and
  stored as reservation snapshots; neither redirect pages nor client totals
  establish price/payment authority.
- Accountless booking is supported. Private access requires control of the
  matching guest email and a valid scoped session, not a reference number alone.
- Current unpaid-cancellation policy is unpaid-cancellation-v1: no cancellation
  fee or refund for eligible pre-check-in bookings with no Payment records.
  Any existing payment record requires financial review. Detailed prepaid fees,
  refunds, arrival/no-show cutoffs and provider settlement policies remain
  separate Phase 7/property decisions.
- Both staff check-in and check-out require full valid recorded Pay at Property
  payment. This is read-only eligibility against existing records: these
  endpoints do not collect/verify money or create Payment records. Synthetic
  paid fixtures in tests are not a production payment-recording workflow.

#### Checkout and private access

ReservationsModule is registered in AppModule and imports PrismaModule and
InventorySafetyModule. Public checkout selects CONFIRMED policy on the backend;
clients cannot supply privileged price/status/policy fields. Origin checks,
DTO validation, throttling and no-store responses remain applicable to public
reservation controllers.

Guest routes now include /checkout/:roomTypeId, /booking-access and /my-booking,
in addition to /, /rooms and /rooms/:id. Rooms.jsx preserves selected dates and
guest count in the checkout link. Checkout.jsx rechecks availability, collects
guest details, displays backend prices and confirms the returned booking.
Duplicate clicks are blocked. Network/unknown outcomes lock resubmission and
ask the guest to contact the property; booking writes are not retried
implicitly, and no general idempotency-key contract is claimed.

Booking access requests return a generic 202 acknowledgment before lookup/SMTP.
A matching reference and email can issue a hashed 15-minute single-use link;
per-reservation resend spacing is one minute. The frontend keeps its URL-fragment
token in memory, removes the fragment, and requires an explicit button action
to exchange it, avoiding automatic link consumption on page load.

Exchange creates a hashed 30-minute booking session in the HttpOnly,
SameSite=Strict nexora_booking_access cookie, scoped to /api/reservations/access
and Secure in production. The browser client uses withCredentials. Current
booking returns a limited projection; logout revokes the session and clears
the cookie. Replacing one browser session does not revoke unrelated browsers.
Private access grants no staff operations or cancellation permission.
BOOKING_ACCESS_URL and SMTP_* configuration are read only by backend code;
real values remain private and real delivery still needs environment acceptance.

#### Assignment, lifecycle, cancellation and stay operations

ADMIN, MANAGER and RECEPTIONIST are explicitly permitted staff roles. Assignment
writers require a confirmed booking with remaining stay dates and at most one
active assignment. Reassignment releases the old row and creates a new one;
release keeps history. Eligibility, active blocks, fixed assignments and global
commitments are checked in the write transaction, followed by an audit record.
A released assignment does not cancel the reservation's inventory commitment.

reservation-lifecycle.ts defines PENDING to CONFIRMED/CANCELLED/EXPIRED,
CONFIRMED to CHECKED_IN/CANCELLED, and CHECKED_IN to CHECKED_OUT; terminal states
have no outgoing transitions. This structural table alone does not authorize
arbitrary status updates or implement a payment-confirmation endpoint.
expirePendingHoldsInTx performs bounded, property-scoped cleanup (maximum 100),
releases active assignments and records reservation.hold_expired events. Staff
can invoke it explicitly; acquisition reuses it for the selected room type.
Cleanup and acquisition roll back together on failure. No scheduled worker is
claimed. Responses include counts and hasMore for additional batches.

Cancellation accepts a normalized 3–500 character reason and only eligible
PENDING/CONFIRMED reservations with remaining stay dates and no Payment records.
Expired holds use the expiration workflow. A successful transaction sets
CANCELLED, releases assignments and writes one policy-bearing audit event.
Repeating cancellation preserves the original event/reason; checked-in stays
cannot use this operation. Guests request cancellation through the property;
there is no guest self-service cancellation endpoint.

Check-in requires identityVerified=true, one matching active assignment,
booked Philippine dates, an eligible READY room and full recorded payment.
It changes the reservation to CHECKED_IN and the room to OCCUPIED. Check-out
rechecks assignment, payment, actual occupancy and card-access constraints,
changes the reservation to CHECKED_OUT and the room to CLEANING, and releases
the assignment. Both preserve booking dates/prices and add audit history.
Retries require the original matching audit event and do not repeat room
mutations. Overdue checked-in occupants and unreleased card access block unsafe
operations; NFC revocation itself remains a future integration.

#### Registered reservation endpoints

All routes below use the /api prefix and no-store responses. Staff routes
require active staff JWTs and explicit role permission; booking-access cookies
and GUEST JWTs do not authorize them. Public means no access JWT is required,
not an exemption from the route's input, Origin, cookie or throttle rules.

| Method and path | Access / behavior |
|---|---|
| POST /api/reservations/pay-at-property | Public; allowed Origin, 5/minute; 201 limited confirmed-booking receipt |
| POST /api/reservations/access/request | Public; allowed Origin, 3/minute; 202 generic acknowledgment |
| POST /api/reservations/access/exchange | Public; allowed Origin, 5/minute; 200 and scoped cookie |
| GET /api/reservations/access/current | Valid booking cookie, 30/minute; 200 limited private view; Vary: Cookie, Origin |
| POST /api/reservations/access/logout | Public; allowed Origin, 10/minute; 204 and cookie clearing |
| GET /api/reservations/:reservationId/assignments | Staff; 200 assignment history |
| POST /api/reservations/:reservationId/assignments | Staff; AssignRoomDto; 201 |
| POST /api/reservations/:reservationId/assignments/:assignmentId/reassign | Staff; AssignRoomDto; 201 |
| POST /api/reservations/:reservationId/assignments/:assignmentId/release | Staff; 200 historical released record |
| POST /api/reservations/lifecycle/expire-holds | Staff; optional integer limit 1–100; 200 cleanup counts/hasMore |
| POST /api/reservations/:reservationId/cancel | Staff; CancelReservationDto.reason; 200 cancellation result |
| POST /api/reservations/:reservationId/check-in | Staff; assignmentId and identityVerified=true; 200 |
| POST /api/reservations/:reservationId/check-out | Staff; assignmentId; 200 |

#### Inventory protection and regression evidence

Acquisition and administrative inventory-reducing writes retain the shared
SQLite write-lock/retry and commitment protection. Whole-stay allocation respects
blocks, unreleased fixed assignments and indirect overlaps without room moves.
Search remains informational. Allocation limits fail closed with staff-review
503 responses; source/test inspection does not verify PostgreSQL concurrency.

There are ten reservation spec files: reservation-validation.spec.ts,
reservation-acquisition.spec.ts, inventory-write.spec.ts, reservations.http.spec.ts,
booking-access.http.spec.ts, room-assignments.http.spec.ts,
reservation-lifecycle.http.spec.ts, reservation-cancellation.http.spec.ts,
reservation-stay.http.spec.ts and reservation-journeys.http.spec.ts.
The journey suite covers private-view/cancellation consistency, same-day room
turnover with cleaning, expiry plus competing acquisition, rollback, failed
checkout/retry and cancellation-versus-replacement contention. Feature suites
also cover permissions, replay/expiry, snapshots and audit failure rollback.
HTTP/acquisition suites provision disposable SQLite databases and migration SQL
under backend/.phase6-* directories, then clean their own synthetic fixtures.
The validation unit suite uses mocks. Existing Phase 4 isolated fixtures remain.

Latest source reference: 22a4319, "Step 10 for Phase 6 Complete". Completion is
owner-confirmed; no new pass count is inferred from commit titles or suite
presence. No application test, build, lint, browser check, SMTP send, migration
or seed was executed for this documentation update. Production acceptance,
real SMTP/cookies, PostgreSQL behavior and physical hardware remain separate.

## D. Backend Structure

| Location / module | Responsibility |
|---|---|
| backend/src/main.ts | Nest bootstrap, startup rejection handler, cookie parsing, ValidationPipe, CORS, /api prefix, port 3000 |
| backend/src/availability/ | Public search controller/DTO, service, pure nightly calculator; read-only availability and stay-price quote |
| backend/src/reservations/ | Registered ReservationsModule; checkout, booking access/email, assignments, lifecycle, cancellation and stay controllers/services; DTOs, policies, inventory helpers and ten spec files |
| backend/src/app.module.ts | Registers Prisma, auth, room management, availability and ReservationsModule; global throttling/JWT/role guards |
| backend/src/auth/ | AuthModule, controller, password/session/registration/verification/SMTP services; DTOs and security tests |
| backend/src/prisma/ | Global PrismaModule, PrismaService, guarded development seed |
| backend/src/room-types/ | RoomTypesModule, DTOs, rate snapshots, and transaction-scoped commitment checks on capacity reduction/deactivation |
| backend/src/rooms/ | RoomsModule, room/status controllers and DTOs; commitment checks on deactivation, reclassification and inventory-removing statuses |
| backend/src/amenities/ | AmenitiesModule, catalog and attachment controllers, service, DTOs |
| backend/src/room-images/ | RoomImagesModule, management/public-file controllers, metadata/validation/storage services, update DTO |
| backend/src/room-blocks/ | RoomBlocksModule, date/reason DTOs, block history and commitment-safe create/edit |
| backend/src/common/decorators/ | Public and explicit-role metadata |
| backend/src/common/guards/ | JWT and role enforcement |
| backend/src/common/ownership/ | Exported OwnershipModule/OwnershipService for explicit feature-level use |
| backend/src/common/validation/ | Rate/capacity validator and Philippine calendar-date/range helpers |
| backend/src/common/inventory/ | Exported InventorySafetyModule/InventorySafetyService for future transaction writers |
| backend/src/generated/prisma/ | Generated client; regenerate using approved tooling, do not edit manually |
| backend/test/ | Phase 2 integrity suite and separate legacy end-to-end test |

OwnershipModule and InventorySafetyModule are reusable exports, not automatically
registered business controllers. Full current directory map: docs/DIRECTORY_STRUCTURE.md.

## E. Database Architecture and Safety

- Current schema: **27 Prisma models and five migrations** under backend/prisma/.
  Phase 6 private access adds ReservationAccessToken and ReservationAccessSession
  to the prior 25 models. Both reference Reservation with restrictive deletion;
  unique tokenHash values and expiry/lookup indexes support scoped access.
  Tokens/sessions store hashes, not raw credentials.
  Preserve the original foundation and accepted extensions, including
  RefreshToken.familyId, EmailVerificationToken and RoomBlock.canceledAt.
- Migration history: 20261027150551_init,
  20261029133315_add_refresh_token_family,
  20261030134255_add_email_verification_tokens, and
  20261031_phase4_step6_room_block_cancellation, and
  20261101070000_reservation_private_access (two additive access tables/indexes).
  Migration presence is verified from files; no development/production migration
  was applied or database inspected during this update.
- PrismaService uses the fixed runtime URL file:./dev.db relative to the
  process directory; run the backend from backend/. Prisma CLI reads
  DATABASE_URL through backend/prisma7.config.ts. Verify their resolved targets
  before database work; do not infer the target from source comments alone.
- Keep development data intact. Use isolated test databases and temporary image
  storage. Never substitute dev.db for a test target, reset it, or seed it as
  part of ordinary testing. Back up consistently and verify recovery before
  approved schema/data changes.
- Use additive, reviewed migrations; SQLite SQL is not a PostgreSQL migration
  strategy. Do not edit generated Prisma client files manually.
- Guest is a stay/contact record; User is an optional login identity. RoomType
  describes category/rate/capacity; Room describes a physical unit. Reservation
  and payment status are independent. Operational status alone is not dated
  availability. Preserve assignment, cancellation and financial history.
- Stay intervals are arrival-inclusive and departure-exclusive. Preserve stored
  reservation price snapshots; current rate changes must not rewrite them.

Existing fixture targets under backend/ include step3.auth.test.db,
step6.ownership.test.db, step7.registration.test.db, step8.security.test.db,
step10.test.db, and phase4.step1.test.db through phase4.step7.test.db.
Inspect suite configuration and ensure the required isolated schema exists
before running those suites; this list does not assert that each fixture is
provisioned. Phase 6 acquisition and HTTP suites build their own disposable
migrated databases under isolated backend/.phase6-* directories, as described
in section C. Never redirect them to development data.

## F. Security and Remaining Review Items

- Enforce JWT identity and ACTIVE status in the backend. @Public() does not
  bypass throttling, DTO validation or controller-specific Origin checks.
  ADMIN has no automatic role/ownership bypass. Missing authentication is 401,
  denied role/Origin is 403, and inaccessible private records use 404.
- Auth POSTs require an allowlisted Origin. Refresh cookies are HttpOnly,
  SameSite=Strict, Path=/api/auth and Secure in production. Logout revokes the
  refresh family; an existing access JWT can remain valid until expiry.
- Ownership helpers protect linked-account records only when explicitly used.
  Current private booking access instead uses a reservation-scoped email/cookie
  capability. Staff reservation operations enforce staff JWTs separately; neither
  a booking reference nor the booking cookie grants staff powers.
- ADMIN/MANAGER manage room/amenity/image data; reception can read physical rooms
  and blocks. Public room-type/image reads exclude inactive types. Uploads are
  decoded and re-encoded, use guarded storage paths and omit internal file paths.
- **Owner review required:** Architecture v2.1 gives reception room/rate
  management View permission, while RoomStatusService permits READY/CLEANING
  transitions. Preserve both the approved baseline and accurate implementation
  description until the intended housekeeping exception is decided.
- main.ts now has one CORS registration with the configured Origin allowlist
  and credentials enabled; the earlier duplicate-CORS finding is superseded.
  Deployed cookies/origins still require acceptance. Booking links use fragments
  and explicit POST exchange; the separate auth verification GET still needs
  prefetch review. SMTP/TLS delivery, durable image storage/recovery, HTTPS,
  PostgreSQL compatibility and backups remain operational work.
- The legacy backend/test/app.e2e-spec.ts expects Hello World! and imports the
  real AppModule without isolating Prisma. Review it before using test:e2e as
  release evidence. Check-in/out APIs now exist, but admin operational screens,
  payment recording, financial reporting and real NFC access remain later work.
  Stay-payment eligibility reads existing receipts without creating or verifying
  them; suspicious provider/refund records require Phase 7 financial review.

## G. Coding and Verification Workflow

1. Follow KISS and the approved stack. Use focused NestJS controllers/services,
   React composition and existing shared date/rate/inventory helpers.
2. Preserve ESM .js suffixes for backend local imports, import type for types,
   existing Vitest tooling and the JavaScript/JSX frontend convention.
3. Validate DTOs, project response fields, calculate prices on the server and
   enforce roles/ownership in backend services. Never trust client prices,
   privileged statuses, identities or property scope.
4. Inspect existing changes and approve the specific implementation scope before
   coding. Finish and verify that scope before advancing phases. Documentation
   maintenance does not authorize new business features, migrations or deployment.
5. Use isolated tests appropriate to the change. Distinguish source inspection,
   owner-reported acceptance and executed results. Record real failures and limits.
6. Keep credentials/private data out of source, documentation and logs. Avoid
   destructive resets, automatic commits, pushes and deployments.

Existing commands, from the relevant application directory:

| Application | Scripts / command | Effect |
|---|---|---|
| Backend | npm run lint | Checks backend source/tests using Oxlint |
| Backend | npm run test | Runs Vitest suites; isolated fixture data/storage may change |
| Backend | npm run build | Writes NestJS build output |
| Backend | npx prisma validate --config prisma7.config.ts | Validates schema/config; does not apply migrations |
| Guest/admin frontend | npm run dev, npm run build, npm run lint, npm run preview | Development, build, lint and preview; no frontend test script is declared |

## H. Latest System Changes and Added Files

Phase 6 source changes through 22a4319 were inspected against the previous
reservation-foundation checkpoint. Existing inventory/validation helpers remain;
the following additions connect them to guest and staff workflows.

| Area / path | Added or updated behavior |
|---|---|
| backend/src/app.module.ts and reservations/reservations.module.ts | Registers the reservation controllers, providers and InventorySafetyModule integration |
| backend/src/main.ts | Uses one credentialed CORS allowlist; removes duplicate registration |
| backend/src/reservations/reservations.controller.ts | Public, Origin-checked Pay at Property booking endpoint with a limited receipt |
| backend/src/reservations/booking-access.controller.ts, booking-access.service.ts, booking-access.config.ts | Generic link request, atomic single-use exchange, scoped booking sessions, private projection, logout and throttling |
| backend/src/reservations/booking-access-email.service.ts | Backend-configured TLS email delivery with fragment link and allowlisted URL validation; the access service logs delivery failure without sensitive details |
| backend/src/reservations/room-assignments.controller.ts and room-assignments.service.ts | Staff history/assign/reassign/release operations with commitment checks, preserved rows and audit events |
| backend/src/reservations/reservation-lifecycle.ts, reservation-lifecycle.controller.ts and reservation-lifecycle.service.ts | Allowed state transitions, bounded expiration, assignment release and audit persistence |
| backend/src/reservations/reservation-acquisition.service.ts | Reuses lifecycle expiration and records the current unpaid-cancellation policy with reservation creation |
| backend/src/reservations/reservation-cancellation.controller.ts, reservation-cancellation.service.ts and cancellation-policy.ts | Staff unpaid cancellation, preserved reason/policy audit, assignment release and safe repeated requests |
| backend/src/reservations/reservation-stay.controller.ts, reservation-stay.service.ts and stay-payment-policy.ts | Identity/room/payment gates; transactional check-in/out, assignment release, cleaning status, retry checks and NFC safety boundary |
| backend/src/reservations/dto/ | Adds booking-access, assign-room, expire-holds, cancel-reservation and reservation-stay DTOs alongside the creation contract |
| backend/src/reservations/*.http.spec.ts | Seven HTTP suites cover checkout/access, assignments, lifecycle, cancellation, stays and integrated journeys; three earlier reservation suites remain |
| backend/prisma/schema.prisma | Adds ReservationAccessToken/ReservationAccessSession and Reservation relations; total 27 models |
| backend/prisma/migrations/20261101070000_reservation_private_access/migration.sql | Fifth checked-in migration; additive access tables, restrictive relations and unique/lookup indexes |
| frontend/guest-web/src/pages/Checkout.jsx | Stay selection, current quote, guest details, policy acknowledgment, receipt and unknown-outcome recovery |
| frontend/guest-web/src/pages/BookingAccess.jsx and MyBooking.jsx | Email-link request/exchange, private session view, expiry/error handling and logout |
| frontend/guest-web/src/services/reservationsApi.js and bookingAccessApi.js | Reservation creation and credentialed private-access requests; no implicit booking retry |
| frontend/guest-web/src/App.jsx, pages/Rooms.jsx and components/Navbar.jsx | Adds checkout/private-view routes, selected-stay booking links and booking-access navigation |
| frontend/guest-web/src/styles/checkout.css and availability.css | Checkout/private-view presentation and room-search booking controls |
| docs/AGENTS.md | Records owner-confirmed Phase 6 10/10 completion, current APIs/schema, source additions, verification limits and Phase 7 boundary |

All 62 direct dependency entries were rechecked against installed metadata and
lockfiles; documented versions still match. Phase 6 uses the existing approved
stack without a new dependency entry. Database documentation in this handoff is
updated to 27 models/five migrations. This task edits only docs/AGENTS.md;
other Markdown files may retain older counts/status/API descriptions. Keep
project Markdown under docs/, with only README.md at the repository root.

## I. Next Phase — Phase 7: Payment System

**Phase 6: COMPLETED — 10/10 per owner confirmation.** The next phase in
Architecture v2.1 section 16 is **Phase 7 — Payment System**, currently
**NOT STARTED / AWAITING APPROVAL**. No additional Phase 6 step is pending in
the owner's accepted checklist; the operational limits above remain relevant.

Prepare and approve the detailed Phase 7 plan around:

- Backend-calculated PayMongo Hosted Checkout and trusted reservation association.
- Verified webhook signatures/events, amount/currency checks and duplicate-safe
  processing; browser returns are not payment evidence.
- Authorized Pay at Property collection records that satisfy existing stay gates.
- Payment/reservation status separation, financial audit history and approved
  refunds/fees. Preserve stored reservation price snapshots.
- Expired holds, late/duplicate/failed provider events, retry/reconciliation rules
  and isolated provider test-mode verification.

Review current stay-payment and cancellation boundaries first: unpaid booking
confirmation does not authorize check-in; stay endpoints require full recorded
payment, and cancellation with any financial history requires review. Public
PayMongo flows, payment recording/refund endpoints and real provider processing
are not implemented by Phase 6 or its synthetic payment fixtures.

Production hosting/domains, PostgreSQL migration verification and physical NFC
hardware remain separate approved phases/decisions. This documentation update
authorizes no new code, dependency installation, database change, commit, push
or deployment.

Related references: [architecture](NEXORA_ARCHITECTURE_V2.1.md), [API](API.md),
[database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md),
[security](SECURITY.md), [directory map](DIRECTORY_STRUCTURE.md), and
[architecture review items](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items).
