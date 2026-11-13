# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-11-12 (guest account booking Step 3 applied). Paths are relative to D:\Web-JSX\NEXORA unless an isolated path is explicitly named.

**Current development checkpoint:** Guest account booking Steps 1-3 are applied
on the `frontend` branch. Source review is complete and owner verification is
pending. The next planned implementation is Step 4, the account-owned My Bookings
list. See [section L](#l-guest-accounts-and-booking-checkpoint-2026-11-12) and the
[implementation plan](superpowers/plans/2026-11-12-guest-account-booking.md).

**Admin UI redesign:** COMPLETED, as confirmed by the owner on 2026-11-12.
The owner reports completing the full Admin UI redesign, including Users & Roles.
This status is owner-confirmed. No new test, lint, build, or browser results are
recorded by this update.

**Admin Screen 10 — Users & Roles:** The frontend implementation is present on
the `frontend` branch. The matching staff API is on the separate `backend`
branch. The owner reports completing the Admin UI redesign. Runtime integration
and acceptance results are not established by this documentation update.

**Latest source checkpoint:** Guest-web, admin-web, and backend responsibility
refactors are present in the main directory. See section K and the
[current directory updates](DIRECTORY_STRUCTURE.md#21-current-refactor-directory-updates-2026-11-10).
This structural update does not change the owner-confirmed roadmap or establish
new runtime acceptance.

**Current owner-confirmed roadmap (2026-11-06):** Phases 1-8 and 10 are
COMPLETED. Phase 9 (NFC) is POSTPONED. Phase 11 is PAUSED and incomplete;
Steps 11.1-11.2 are tentative owner recollection. Phase 12 is DEFERRED.
The owner explicitly prioritized UI/UX redesign over proceeding with Phases 11/12.

**Historical UI work checkpoint (2026-11-06):** Guest-web UI/UX redesign in the main project after completed
isolated backend/frontend transfer. Screens 4-6, 7 (Find Booking), 10 (My Booking)
and 11 (About) are owner-accepted. Screen 12 Contact is installed with fictional
sample details and awaits owner-run acceptance results.

**Historical UI continuation checkpoint (2026-11-06):** Check Contact at /contact before advancing
to the proposed Screen 13 Policies. Screens 8-9 guest Login/Register require a
separate scope review. See [section J](#j-current-checkpoint---guest-web-uiux-redesign-2026-11-06).
Do not resume Phase 11/12 or treat page acceptance as phase completion.

**Historical milestone snapshot:** The phase descriptions below retain the
earlier 2026-11-01 record. Later owner-approved work exists, including admin and
payment modules. Older "not started" statements are not a current inventory or
instructions to restart those phases. The roadmap above and section C govern
current phase status; section J governs the current redesign. Where
AI_HANDOFF.md or another guide retains an older phase status, use this latest
owner update. Section L governs the current guest account work. Completion below
is owner-reported, not a new source/test audit.

**Earlier completion record:** Phases 1–6 are COMPLETED per owner confirmation,
including Phase 3 (8/8), Phase 4 (7/7), Phase 5 (7/7) and Phase 6 (10/10).
**Earlier phase tracker:** Phase 7 — Payment System: IN PROGRESS.
**Earlier Steps 7.1–7.2:** Accepted for advancement by owner instruction; provider smoke result not independently observed.
**Earlier Step 7.3:** Installed; 398 tests across 25 files passed; actual verified PayMongo test receipt confirmed. Provider HTTP acknowledgment, manual redelivery and final owner acceptance remained unconfirmed in that snapshot.
**Earlier Steps 7.4–7.8:** Recorded as NOT STARTED in that snapshot; not a current source assessment.

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
- The owner approved mandatory guest accounts for prototype website bookings.
  Steps 1-3 now provide registration, verification, login, authenticated booking,
  and reservation ownership through Guest.userId. Old email-access APIs are
  retired. The account-owned booking-list API remains Step 4. A booking reference
  requires authenticated ownership before private details or payment access.
  Read-only payment summaries are implemented. Test-mode Hosted Checkout and verified webhook receipt processing
  are installed. Staff collection and payment operations were developed in later
  owner-completed phases; the older handoff sections below do not describe their
  full current scope. NFC remains postponed. Live payments are not authorized.
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

Phases 1-8 and 10 are owner-confirmed complete. Phase 9 remains postponed.
Phase 11 is paused/incomplete and Phase 12 is deferred while guest-web UI/UX
redesign continues. Earlier evidence remains historical. Section J records
current installed screens, owner acceptance and the next continuation step.

| Phase | Status | Delivered scope |
|---|---|---|
| 1 — Project Foundation | COMPLETED | Separate React applications, NestJS backend, API connectivity and project configuration |
| 2 — Database Foundation | COMPLETED | Prisma/SQLite schema, migrations, relationships, guarded seed and integrity-test foundation |
| 3 — Authentication & RBAC | COMPLETED — 8/8 | Accounts, secure sessions, explicit roles, ownership and email verification |
| 4 — Room Management | COMPLETED — 7/7 | Room types, physical rooms, amenities, images, rates/capacity, operational states, blocks and eligibility helpers |
| 5 — Guest Website | COMPLETED — 7/7 | Homepage, room browsing/details, integrated availability search, server-priced stay display, feedback and responsive/keyboard work |
| 6 — Reservation System | COMPLETED — 10/10 | Registered reservation API, guest checkout/private access, assignment history, lifecycle/expiration, cancellation, staff stays and accepted regression work |
| 7 — Payment System | COMPLETED — owner-confirmed | Payment development milestone complete; current payment UI/UX and booking-policy redesign remains separate ongoing work |
| 8 — Admin Dashboard | COMPLETED — owner-confirmed | Admin operations and staff workspace milestone complete |
| 9 — NFC Management | POSTPONED | Resume only when explicitly requested; do not treat as implemented or complete |
| 10 — Reports and Settings | COMPLETED — owner-confirmed | Reports and settings milestone complete |
| 11 — Testing and Security | PAUSED / INCOMPLETE | Steps 11.1-11.2 tentatively reported complete; owner paused further work to prioritize UI/UX. |
| 12 — Production Deployment | DEFERRED | Owner deferred Phase 12 while prioritizing UI/UX; no deployment authorized. |

### Current completion checklist

- [x] Phases 1–8 completed, per owner confirmation.
- [x] Phase 10 completed, per owner confirmation.
- [ ] Phase 9 NFC implementation — postponed, not completed.
- [ ] Confirm the exact Phase 11 checkpoint; Steps 11.1–11.2 are tentatively reported complete.
- [ ] Resume remaining Phase 11 testing/security work only when the owner requests it.
- [ ] Complete remaining guest-web UI/UX screens and owner acceptance in section J.

Completed original phases do not establish acceptance of every redesigned screen.
Main transfer is owner-confirmed complete; Contact acceptance and later UI work
remain pending. Production deployment is deferred.

### Phase 1 — Project Foundation

- [x] Separate guest/admin React/Vite applications with layouts and routing.
- [x] NestJS API, public GET /api/health, /api prefix and Axios connectivity.
- [x] Package scripts, styles, environment templates and documentation foundation.

### Phase 2 — Database Foundation

- [x] Prisma models, relationships, CUID identifiers and initial migration.
- [x] Integer-centavo money, Philippine stay-date semantics and UTC event timestamps.
- [x] NestJS database provider, guarded seed and isolated integrity-test foundation.
- [x] Original 23 core models plus RoomTypeAmenity established 24 models;
  EmailVerificationToken subsequently brought that historical total to 25;
  Phase 6 private-access models bring the current total to 27.

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

- PayMongo-style holds last 15 minutes in the acquisition foundation. The
  Step 7.2 test checkout targets existing CONFIRMED bookings; it does not add a
  public PayMongo reservation-creation flow. Expired holds stop reducing searchable
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
- Both staff check-in and check-out require full valid recorded payment.
  PayMongo receipts count only with matching processed, signature-verified test
  evidence; review flags block eligibility. Stay endpoints remain read-only
  financial consumers and never collect money or automatically check guests in.

#### Checkout and private access

ReservationsModule is registered in AppModule and imports PrismaModule and
InventorySafetyModule and PaymentsModule. Public checkout selects CONFIRMED policy on the backend;
clients cannot supply privileged price/status/policy fields. Origin checks,
DTO validation, throttling and no-store responses remain applicable to public
reservation controllers.

Guest routes now include /checkout/:roomTypeId, /booking-access and /my-booking,
and /payment-return, in addition to /, /rooms and /rooms/:id. Rooms.jsx preserves selected dates and
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
| GET /api/reservations/access/payment-summary | Added by Step 7.1; valid private session, 30/minute; 200 booking-level financial summary |
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

### Phase 7 — Payment System (Completed; historical handoff below)

Phase 7 is completed per the latest owner confirmation. Section I retains the
earlier Steps 7.1–7.3 handoff and its verification evidence; its old pending
items are historical, not the current development roadmap. The payment UI/UX
redesign is ongoing and tracked separately in section J.

## D. Backend Structure

| Location / module | Responsibility |
|---|---|
| backend/src/main.ts | Nest bootstrap, startup rejection handler, cookie parsing, ValidationPipe, CORS, /api prefix, port 3000 |
| backend/src/availability/ | Public search controller/DTO, service, pure nightly calculator; read-only availability and stay-price quote |
| backend/src/payments/ | Summary/checkout services and controllers, test PayMongo adapter, raw-body webhook verification, payment evidence and six test files; imported through ReservationsModule |
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

- Current source schema: **28 Prisma models and seven migration source directories**
  in both main and the isolated backend, inspected on 2026-11-03. The main
  implementation is only partially copied; see section J before any generation,
  deployment or database operation.
  Step 7.2 adds nullable checkout-attempt fields and a unique request-key index;
  Steps 7.1 and 7.3 need no new schema or migration.
  Phase 6 private access adds ReservationAccessToken and ReservationAccessSession
  to the prior 25 models. Both reference Reservation with restrictive deletion;
  unique tokenHash values and expiry/lookup indexes support scoped access.
  Tokens/sessions store hashes, not raw credentials.
  Preserve the original foundation and accepted extensions, including
  RefreshToken.familyId, EmailVerificationToken and RoomBlock.canceledAt.
  The guest-booking redesign adds GuestBookingAttempt and six nullable
  Reservation policy/timing fields. Existing records must not receive invented
  arrival times or retrospective application of the revised booking policy.
- Migration history: 20261027150551_init,
  20261029133315_add_refresh_token_family,
  20261030134255_add_email_verification_tokens, and
  20261031_phase4_step6_room_block_cancellation, and
  20261101070000_reservation_private_access (two additive access tables/indexes), and
  20261101090000_payment_checkout_attempts, and
  20261103090000_guest_booking_flow (guest request ledger, nullable policy/timing
  fields and indexes). This is a source-directory inventory, not proof of main
  database deployment history. Redesign checks used disposable databases per
  owner-supplied evidence. Main dev.db history and a transfer/migration plan
  remain separate review items; no database operation is authorized by this
  documentation update.
- PrismaService defaults to file:./dev.db relative to the process directory.
  Manual testing must explicitly set NEXORA_RUNTIME_DATABASE_URL to an absolute
  file: URL for a fresh isolated database. Run the backend from backend/. Prisma CLI reads
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
  a booking reference nor the booking cookie grants staff powers. Step 7.1 JWT
  summaries reuse OwnershipService with an optional transaction client so record
  authorization and financial reads share the same transaction. Accountless
  summaries derive their booking number only from the verified cookie session.
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
  staff collections, refunds, financial reporting and real NFC access remain
  later work. Test PayMongo receipt recording now belongs to the verified
  webhook service. Stay-payment eligibility consumes its stored proof without
  performing provider calls; suspicious provider/refund records require review.

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

### Step 7.1 additions and updates

| Path | Change |
|---|---|
| backend/src/payments/payment-summary.ts | Pure booking-level calculation of collections, refunds, balances, review flags and derived status |
| backend/src/payments/payment-summary.service.ts | Read transactions, explicit staff/guest ownership, verified-session lookup and safe aggregate projections |
| backend/src/payments/payments.controller.ts and payments.module.ts | JWT summary route; module imports OwnershipModule/PrismaModule and exports PaymentSummaryService |
| backend/src/payments/payment-summary.spec.ts and payment-summary.http.spec.ts | New calculation and HTTP authorization/privacy test sources |
| backend/src/common/ownership/ownership.service.ts | Optional transaction-scoped database argument for assertReservationAccess; default callers retain their existing behavior |
| backend/src/reservations/booking-access.controller.ts and reservations.module.ts | Adds private-session summary route and imports PaymentsModule |
| backend/src/reservations/stay-payment-policy.ts | Reuses shared summary calculation; retains provider/refund history restrictions before check-in/out |

These are read-only financial additions. No schema migration, collection,
provider request or refund processing is added. Detailed review-copy evidence
is recorded in section I.

### Completed Phase 6 implementation record

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
updated to 27 models/five migrations. This update synchronizes the six requested documents: AGENTS.md, API.md,
DATABASE_SCHEMA.md, SECURITY.md, BUSINESS_FLOWS.md and DIRECTORY_STRUCTURE.md.
Other Markdown files may retain older status/API descriptions. Keep
project Markdown under docs/, with only README.md at the repository root.

## I. Phase 7 — Payment System (Historical implementation handoff)

Phase 7 — Payment System: **COMPLETED per latest owner confirmation**.

The step-level notes in this section retain the earlier handoff snapshot.
Historical pending/not-started labels below are superseded by section C and
must not be used to restart completed phases. They remain evidence of what was
observed at that time, not a fresh verification of all later work.

**Steps 7.1–7.2:** accepted for advancement by owner instruction.
**Step 7.3:** installed, locally verified and actual verified test receipt
confirmed. Provider HTTP acknowledgment, manual redelivery and final owner
acceptance remain unconfirmed. Steps 7.4–7.8 remain **NOT STARTED**.
Phases 1–6 remain owner-confirmed complete.

### Read-only contracts and semantics

- GET /api/payments/reservations/:reservationId/summary requires JWT and explicit
  ADMIN/MANAGER/RECEPTIONIST permission or linked GUEST ownership. Missing/invalid
  authentication returns 401; inaccessible/missing private records share 404.
- GET /api/reservations/access/payment-summary uses a valid private booking
  session. Its booking number comes from that verified session, not a request
  identifier. Invalid sessions keep private-access 404 behavior.
- Both routes return a data envelope with Cache-Control: no-store. They expose
  aggregate booking totals without payment/provider IDs, references or staff
  identities. They grant no financial mutation permissions.
- Summaries include reservationNumber, reservationStatus, currency,
  bookedTotalCentavos, collectedCentavos, refundedCentavos, pendingRefundCentavos,
  netPaidCentavos, balanceDueCentavos, overpaidCentavos, hasPendingPayment,
  status and requiresReview. Amounts use integer PHP centavos.
- Payment.amountCentavos is an individual collection, not the booking total.
  Completed receipts combine; pending/failed attempts do not count as collected.
  Completed refunds reduce net paid once; pending refunds reserve refundable
  amounts. Failed/cancelled refunds do not reduce collected funds.
- Individual PARTIALLY_PAID receipts and inconsistent/unverified provider
  evidence require financial review (409). A derived PARTIALLY_PAID booking
  summary is separate from that ambiguous legacy receipt status.
- Pending refunds and excess collections can return REVIEW_REQUIRED and
  requiresReview. CANCELLED/EXPIRED/CHECKED_OUT bookings return null for
  balance/overpayment obligations; historical booked totals remain intact.
- Check-in/out uses the shared calculation while retaining conservative
  provider/refund restrictions. No new collection/refund/payment-status write
  or provider verification is established by these summaries.

### Supplied review-copy evidence — not rerun in this workspace

The owner-supplied implementation report states:

| Check | Reported review-copy result |
|---|---|
| New payment suites | 29 tests passed across two files |
| Combined affected regression and ownership suites | 313 tests passed across 19 files |
| TypeScript, targeted lint and backend build | Passed |
| backend/dev.db | Hash unchanged in the review copy |
| Schema migration / collection / provider requests / refund processing | None |

These are historical review-copy results. The current local checks below
supersede the earlier owner-local testing gap for the affected suites. Actual
provider evidence is recorded separately in the final checkpoint. No development
database contents or secret values are displayed in the verification output.

### Next boundary

Actual isolated PayMongo test receipt processing is verified. Record any
remaining provider acknowledgment/redelivery observations and owner acceptance
for Step 7.3. Do not advance to Step 7.4. Hosted Checkout and verified test-webhook receipt
writes are installed; staff collections and refunds remain future steps.
No browser return establishes payment success. Preserve reservation snapshots,
private access boundaries and the existing unpaid-cancellation restrictions.

Production hosting/domains, PostgreSQL compatibility and physical NFC hardware
remain separate phases/decisions. The Step 7.3 verification introduces no new
application code, dependency, schema, commit, push or deployment.

Related references: [architecture](NEXORA_ARCHITECTURE_V2.1.md), [API](API.md),
[payment semantics](DATABASE_SCHEMA.md#phase-71-payment-semantics),
[security](SECURITY.md#phase-71-payment-summary-authorization),
[business flows](BUSINESS_FLOWS.md#phase-71-payment-summary-foundation),
[directory map](DIRECTORY_STRUCTURE.md), and
[architecture review items](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items).


## Phase 7.2 — Test-mode Hosted Checkout handoff

Step 7.1 is accepted based on the owner instruction to advance. Step 7.2 source is installed, and its affected suites passed in the current Step 7.3 verification. Its earlier review-copy evidence follows for context. The later isolated provider test produced a matching checkout and verified paid receipt; see the final checkpoint. Steps 7.4–7.8 remain not started.

Current schema: 27 models and six migration source directories. Step 7.2 adds four nullable Payment fields and a unique request-key hash index; it adds no model. No migration was applied to backend/dev.db.

Review evidence: 36 new checkout/migration/runtime tests; affected regression total 349 tests across 23 files. Backend build, guest build and targeted lint passed. Provider calls in automated tests are mocked. The fresh synthetic demo initializer and absolute runtime override were verified.

Prisma CLI migrate deploy failed in this environment with a schema-engine error. No CLI deployment success is claimed. The test-only demo initializer applies migration SQL directly to a fresh, specifically named SQLite file and does not create Prisma deployment history.

Checkout targets existing CONFIRMED bookings with remaining stay dates. CREATING/READY/UNKNOWN are checkout-link states, never payment success. The adapter only permits test credentials. Normal database access still defaults to backend/dev.db; isolated manual testing must set NEXORA_RUNTIME_DATABASE_URL to an absolute file: path.


## Phase 7.3 — Verified test webhook handoff (historical checkpoint)

This checkpoint supersedes earlier planned-status descriptions. On 2026-11-01,
all 25 prepared-manifest destinations matched the repository byte-for-byte:
15 source/test files and 10 Markdown files. No reinstallation or application
code change was needed. The owner approved local verification and updates to
AGENTS.md and IMPLEMENTATION_GUIDE.md. Steps 7.4–7.8 remain not started.

Installed Step 7.3 behavior:

- POST /api/webhooks/paymongo uses Nest raw-body capture, the backend-only
  PAYMONGO_TEST_WEBHOOK_SECRET, HMAC-SHA256 and timingSafeEqual. This secret is
  separate from PAYMONGO_TEST_SECRET_KEY. Only verified test-mode
  checkout_session.payment.paid events can establish a receipt.
- Matching requires the durable checkout attempt, local Payment.id reference,
  provider session/payment IDs, exact integer gross centavos and PHP currency.
- Payment, sanitized PaymentEvent proof and audit are one transaction.
  Unique provider identifiers, the conditional payment update and SQLite write
  serialization prevent duplicate receipt effects across clients. Database
  persistence failure returns retryable HTTP 503.
- Early verified payment survives checkout creation finishing later. Mismatched,
  stale, late and conflicting events remain for review. Receipt recording never
  revives CANCELLED/EXPIRED reservations or automatically checks guests in.
- payment-evidence.ts feeds summaries and stay-payment policy. BookingPayment,
  My Booking and PaymentReturn use authenticated backend records; return URL
  parameters never establish success.

Current local execution results:

| Check | Result / isolation |
|---|---|
| Webhook HTTP suite in backend/ | 25 tests passed, 1 file; disposable databases and mocked provider |
| Affected regression plus inventory safety | 373 tests passed, 24 files; disposable backend copy and synthetic databases, excluding the already-run webhook file |
| Combined distinct coverage | 398 tests passed across 25 files, including 24 inventory safety cases |
| Backend TypeScript | tsc --noEmit --incremental false passed |
| Backend and guest builds | npm.cmd run build passed in both applications |
| Targeted backend and guest lint | Passed; no autofix |

The five required legacy fixtures exist, including phase4.step7.test.db,
but lack the newer checkout columns. Their schema metadata was inspected
read-only. Original fixtures were left untouched. Regression used fresh
synthetic fixtures in a temporary backend copy, applying only existing migration
SQL; neither development data nor old fixture data was copied. Missing dedicated
fixtures remain a stop condition. This is affected coverage, not a full-suite,
browser or PostgreSQL acceptance claim. The legacy app.e2e-spec.ts was not run.

No new schema/migration: 27 models, six migration sources. Neither dev.db was
opened by an application or test; both retained their size and modification
time. Credentials were checked locally without printing their values; raw guest
details were excluded from diagnostic output. No live payment, refund, staff
collection, commit, push or deployment was performed. Existing dependency
manifests and application source remain intact. The owner registered the test
webhook during the manual phase below.

Actual isolated provider test evidence (2026-11-01):

- A fresh manual database was created with the existing guarded initializer.
  The backend used its explicit absolute NEXORA_RUNTIME_DATABASE_URL. This
  fixture is retained for owner review, separately from the removed automated
  test workspaces. No dev.db was migrated, seeded, reset or replaced.
- The owner confirmed the public health response, test-mode webhook registration,
  booking-access email delivery, private My Booking access and the displayed
  full-payment message. Configuration values, access links and the temporary
  public endpoint address are not reproduced here.
- Read-only verification of the isolated database found one PAID receipt, one
  PROCESSED signature-verified checkout_session.payment.paid event and one
  payment.paid audit. The production evidence helper accepted the exact local
  reference, provider IDs, gross amount, currency and test-mode proof. There
  was no payment review flag. All current fixture bookings remained CONFIRMED.
- The owner-supplied checkout record has livemode=false and one paid payment.
  Its session ID, local Payment.id reference and paid payment ID/amount/currency
  match the stored receipt. Only comparison results were printed; no raw
  checkout payload or identifying values were copied into documentation.
- The supplied file is a checkout_session resource, not a delivery log: it
  contains no webhook HTTP response status. Provider HTTP acknowledgment and
  actual manual redelivery were not independently observed. Retry/concurrent
  duplicate safety is supported by the passed automated webhook cases; no
  manual provider replay success is claimed.

Remaining checklist:

- [x] Confirm prepared files are installed without replacing existing changes.
- [x] Execute current isolated webhook/regression, type, build and lint checks.
- [x] Configure an explicitly isolated runtime and privately set separate test credentials.
- [x] Verify an actual signed test event and matching backend receipt/event/audit.
- [x] Confirm the supplied provider checkout matches the stored verified receipt.
- [x] Verify basic retry/concurrent duplicate safety in isolated automated tests.
- [x] Record provider evidence without raw private payloads.
- [ ] Independently observe the provider delivery HTTP response and manual redelivery, if available.
- [ ] Obtain final owner acceptance; Step 7.4 remains outside this task.

Basic event uniqueness and atomic receipt/event/audit writes are required safety within Step 7.3. Expanded retry/recovery and reconciliation are still Steps 7.4 and 7.7. Do not mark them complete from these tests.

## J. Current checkpoint - Guest-web UI/UX redesign (2026-11-06)

This section governs the current continuation. The owner paused Phase 11
(Testing and Security) and Phase 12 (Production Deployment) to prioritize the
UI/UX redesign. Phase 11 is incomplete; Steps 11.1-11.2 remain tentative owner
recollection. Phase 9 NFC remains postponed. Phases 1-8 and 10 remain complete
per owner confirmation. Page-level acceptance does not complete Phase 11.

### Main project and transfer history

- The isolated backend and frontend transfer/migration to D:\Web-JSX\NEXORA is
  complete per owner confirmation. Continue current UI work in the main project.
- Earlier owner-supplied outputs showed 50 reviewed source files matched the
  isolated snapshot. A database backup and migration rehearsal preceded applying
  the rehearsed database to backend/dev.db. Supplied preservation checks reported
  preserved records, matching schema, SQLite integrity and no foreign-key violations.
- Preserve the isolated review workspace and main backups. Do not clean, replace,
  migrate, seed or reset a database as part of UI work.
- An earlier deadline/property-review banner is historical context, not the next
  active task. The owner subsequently reported payment tests passed after webhook
  configuration was corrected. This does not establish the state of every booking.

### Current UI progress against the supplied design reference

Reference: NEXORA Guest Website - Simple UI/UX Design Overview. Retain the navy,
white and gold palette, responsive cards, accessible navigation and existing
approved booking/security behavior. The reference guides presentation; it does
not override implemented business rules.

| Reference screen | Current state / evidence |
|---|---|
| 1 - Home | Earlier approved redesign includes header, hero, featured rooms and footer. |
| 2 - Rooms | Earlier room-listing redesign installed and owner-accepted. |
| 3 - Room Details | Earlier gallery, amenities and stay-summary redesign installed and owner-accepted. |
| 4-6 - Booking, Checkout, Confirmation | Owner explicitly confirmed all checks completed/passed before advancing to Screen 7. |
| 7 - Find Booking | Redesigned private email-link access page installed; owner confirmed all checks passed. |
| 8-9 - Guest Login/Register | No corresponding guest-web routes in the inspected App.jsx. Separate scope review is required; optional account models/backend auth do not establish installed guest screens. |
| 10 - My Booking | Redesigned single-private-booking view installed; owner confirmed all checks passed. The reference's multi-booking list is not implemented by this page. |
| 11 - About | New /about page, asset and navigation integration installed; owner confirmed all checks passed. |
| 12 - Contact | New /contact page and navigation integration installed. Owner-run lint/build/browser acceptance is still pending confirmation. |
| 13 - Policies | Proposed next screen after Contact acceptance; no /policies route or Policies page was present in the inspected source. Design/content approval and implementation remain pending. |

Acceptance is owner-reported. This documentation edit did not run application
tests, lint, builds, provider requests or browser checks. Do not invent test
counts or treat source presence as passing runtime evidence.

### Recent directory and source changes

All paths below are relative to frontend/guest-web/.

| File | Installed change |
|---|---|
| src/pages/BookingAccess.jsx | Centered Find Booking card with request/loading/error feedback and explicit email-link exchange action. |
| src/styles/booking-access.css | Dedicated responsive styles for private booking access. |
| src/pages/MyBooking.jsx | Booking identity/status, stay and payment cards, deadline notices, refresh and end-access actions. |
| src/components/BookingPayment.jsx | Added my-booking card/payment section classes; existing payment processing logic retained. |
| src/styles/my-booking.css | Responsive stay/payment layout, reservation badges and page-scoped payment styling. |
| src/pages/About.jsx | Property introduction, three information cards and room/private-booking links. Uses the existing src/assets/hero/property-evening.jpg asset. |
| src/styles/about.css | Introduction/image layout, feature cards and responsive About styling. |
| src/pages/Contact.jsx | Contact cards, sample information notice, room/private-booking links and guarded email/call actions. |
| src/styles/contact.css | Responsive two-card Contact layout and sample/disabled-action styling. |
| src/App.jsx | Added /about and /contact under the existing GuestLayout. Existing booking routes retained. |
| src/components/Navbar.jsx | Added About and Contact links using existing active-route and mobile-close behavior. |
| src/components/Footer.jsx | Added About NEXORA and Contact under Explore. |

Current guest routes: /, /rooms, /rooms/:id, /checkout/:roomTypeId,
/booking-access, /my-booking, /payment-return, /about and /contact.

No backend, database schema, migration or dependency change was part of these
recent screen implementations. The dependency inventory in section B remains
its dated historical audit; no fresh installed-version audit is claimed here.

### Contact page limitations and acceptance checkpoint

The owner explicitly requested made-up contact details. Contact.jsx therefore
keeps isSample: true, a fictional email/phone/address/hours set and a visible
sample-information notice. Email and call buttons are intentionally disabled.
Real contact values must be verified and substituted before setting isSample to
false. No real contact information is implied by this design.

The page does not submit messages or use the Admin-only property settings API.
The alternate mailto/tel links become available only after replacing sample
values and disabling sample mode. A message-submission service, map integration,
or public property-settings API is outside this implemented step.

Next action: the owner runs Contact lint/build and browser acceptance. Check
/contact directly and on refresh, header/footer links, visible sample notice,
disabled sample contact buttons, working Find my booking/Explore rooms links,
mobile-menu close behavior, keyboard focus and layouts at 320px, 375px, 768px
and desktop widths. Do not mark Contact accepted until the owner confirms results.
After that acceptance, propose Screen 13 Policies using approved business rules;
do not invent cancellation fees, refund terms, or legal/privacy commitments.

### Booking and payment rules to preserve during redesign

- Pay at Property starts PENDING. Staff records contact and explicit guest
  agreement before confirmation. The first contact starts a 24-hour response
  window; repeated contact does not extend it. The earlier deadline applies:
  response deadline or expected arrival plus 30 minutes. Confirmation records
  no payment. These pending-request rules do not authorize cancelling confirmed
  no-shows automatically.
- PayMongo starts PENDING with a 15-minute hold. Confirmation requires verified,
  matching, timely full PHP payment and safe inventory. Late/conflicting events
  require review; never revive closed bookings or automatically check guests in.
- Arrival times use Asia/Manila. Backend price snapshots and verified payment
  records remain authoritative. Reservation status is separate from payment status.
  Return URL parameters do not establish payment success.
- Private email links expire after 15 minutes, are single-use, and grant 30-minute
  access. Reference/email entry is not authorization by itself. Keep no-match
  responses generic, preserve duplicate-submit guards and booking scope checks.
- Original request bytes and the separate backend-only webhook signing secret
  are used for HMAC-SHA256 verification. Payment/event/audit persistence remains
  atomic and duplicate-safe. Never publish secrets, tokens or guest payloads.

### Deferred technical work

The last supplied main startup configuration explicitly selected backend/dev.db,
backend port 3000, guest origin http://localhost:5175 and admin origin
http://localhost:5176, with both frontends using http://localhost:3000/api.
Actual running process configuration must be checked before diagnosing runtime
issues; this documentation update did not inspect process environments.

The deadline worker currently requires an explicit absolute .test.db target.
The last main startup instructions set NEXORA_BOOKING_DEADLINE_WORKER_ENABLED=false.
Automatic deadline processing on main dev.db remains a deferred integration gap,
not a completed result of screen acceptance. Do not enable it on dev.db or resume
Phase 11/12 without the owner's explicit instruction.

The owner reported main PayMongo tests passed after correcting missing/mismatched
webhook signing configuration (503 then 401). The signing secret can be retained
privately in backend/.env. Do not copy its value into documentation. These reports
supersede the earlier active payment-debug checkpoint without claiming that every
historical review booking was reconciled.

### Current completion checklist

- [x] Isolated backend/frontend transfer to main owner-confirmed complete.
- [x] Screens 4-6 accepted by the owner after reported tests.
- [x] Screen 7 Find Booking installed and owner-accepted.
- [x] Screen 10 My Booking installed and owner-accepted.
- [x] Screen 11 About installed and owner-accepted.
- [x] Screen 12 Contact installed with owner-approved fictional/sample details.
- [ ] Owner confirmation of Contact lint/build/browser acceptance.
- [ ] Screen 13 Policies design/content approval and implementation after Contact.
- [ ] Separate scope decision for optional guest Login/Register UI.
- [ ] Replace sample contact details before enabling real contact actions.
- [ ] Resume Phase 11 and address the deadline-worker gap only when requested.
- [ ] Phase 9 NFC remains postponed; Phase 12 remains deferred.

### Owner's execution and verification workflow

Explain the next screen and preview its design before generating code. Provide
precise paths paired with copy-paste code directly in chat. For agreed steps,
the owner uses EggPie as the explicit trigger to apply the most recently supplied
and approved changes only. It is not blanket permission to edit unrelated files
or implement later screens. Wait for that trigger or another explicit execution
instruction before editing application code.

When execution is authorized, apply files in the supplied order and report after
each file is finished. Preserve unrelated edits. The owner runs all tests, lint,
builds and browser checks; do not run them yourself under the current workflow.
Do not advance past acceptance without owner confirmation. Do not commit, push,
deploy, modify databases or add dependencies without explicit authorization.

This request authorizes docs/AGENTS.md only. No other Markdown or application
file is changed by this documentation update. AI_HANDOFF.md and older guides
may retain stale checkpoints; use this section and current owner instructions
for continuation, and the architecture/coding guides for system requirements.

## K. Responsibility Separation Checkpoint (2026-11-10)

The same behavior-preserving refactor was applied to guest-web, admin-web, and
the backend. The changes organize existing code; they do not introduce new
business rules, routes, database models, or UI designs.

| Application | Current file organization |
|---|---|
| Guest web | `src/hooks/` contains state/effects/handlers; `components/rooms/`, `checkout/`, and `booking/` contain extracted presentation; `constants/` holds fixed content; `utils/` holds focused helpers; `styles/tokens.css` holds existing visual values |
| Admin web | `src/hooks/` contains screen/form/session/layout coordination; feature folders under `components/` contain presentation; existing `auth/` retains context and route guards; `constants/`, `utils/`, and `styles/tokens.css` separate definitions and visual values |
| Backend | Existing controllers/DTOs retain HTTP validation; services retain authorization and transaction orchestration; 25 feature-local files separate types, policies, projections, validation, refund settlement, and reconciliation helpers |

Guest component CSS was relocated to `styles/availability-search.css`,
`styles/featured-rooms.css`, and `styles/home-stay-search.css`. Other screen CSS
remains in place. Frontend API clients remain in their existing service folders.
Backend helper extraction preserves original service exports where needed and
passes the same transaction clients to extracted database helpers.

Verification records, with their original limitations:

- [Guest refactor record](superpowers/plans/2026-11-10-guest-web-refactor.md):
  records lint/build, 14 helper tests, markup/CSS comparison, and source review.
  Full browser and live payment acceptance were not established.
- [Admin refactor record](superpowers/plans/2026-11-10-admin-web-refactor.md):
  records lint/build, 15 helper tests, markup/CSS/state-handler comparison, and
  source review. The existing bundle-size warning remains; live staff/payment
  operations were not exercised.
- [Backend refactor record](superpowers/plans/2026-11-10-backend-refactor.md):
  source comparison and independent review found no identified behavior changes.
  Backend tests, lint, build, database operations, and provider calls were not run.
  Owner verification remains pending.

This Markdown synchronization only updates directory/refactor documentation.
It does not rerun the recorded checks, change application code, or advance
Phases 9, 11, or 12.

## L. Guest accounts and booking checkpoint (2026-11-12)

This section supersedes earlier optional-account and private email-access
continuation instructions for the current prototype website. The Admin UI
redesign remains owner-confirmed complete. NFC remains postponed, Phase 11
remains paused, and deployment remains deferred.

### Approved scope

- Require a verified GUEST account before website booking creation.
- Reuse existing authentication, linked Guest profiles, inventory acquisition,
  pricing, and payment services. Follow CODING_PRINCIPLES.md and keep the
  implementation suitable for a prototype.
- Existing accountless reservations are development records. No data cleanup or
  account-claiming migration was performed.
- Retain the existing system logo and use the supplied Home/Login references.
- Password recovery is deferred by owner approval.

### Applied source changes

| Step | Saved implementation | Verification status |
|---|---|---|
| 1 - Guest accounts | Register, Login, Verify Email, and Logout pages; session restore, refresh, logout, safe internal return paths, and guest route guard. Verification links use the documented guest origin on port 5175. | Applied; owner checks pending. |
| 2 - Shared header | Existing logo, public navigation including Policies, active gold underline, Sign In/Out, Explore Rooms, responsive menu, Escape focus, and browser Back menu-state correction. | Applied; owner checks pending. |
| 3 - Account-owned booking | Authenticated creation/recovery, backend-derived profile identity, existing Guest connection within the inventory transaction, per-account recovery storage, owned details/payment operations, and protected checkout/payment-return/detail routes. | Applied; static review complete; owner checks pending. |

Step 3 moved supported booking requests to `/api/guest/reservations`.
Profile and booking-reference reads require GUEST authentication. Payment and
recovery operations check account ownership. Existing payment confirmation,
inventory, and timing rules remain delegated to their existing services.

Old `/api/reservations/access` email-access endpoints now return the retired
response. The old accountless creation path is no longer registered by
GuestBookingsController. Existing `/booking-access` website links now open an
account sign-in/reference lookup page instead of the retired email form.

Single-booking details and payment returns were adapted in Step 3 so the new
checkout flow has working account-based source entry points. The complete
My Bookings list is still pending. Existing accountless test fixtures require
updates for authenticated requests during the remaining verification work.

### Verification boundary

Steps 1-3 were saved and reviewed through source inspection. No tests, lint,
builds, apps, browser checks, migrations, or provider calls were run for these
steps by the assistant. The owner has authorized advancement but has not supplied
specific acceptance results for this account-booking work.

The changed source is currently on `frontend`. This checkpoint does not establish
merging with the separate staff backend branch, runtime deployment, or provider
success. Existing historical test reports apply only to their recorded scope.

### Next step

Step 4 adds the authenticated My Bookings list, with 20 records per page, an
empty state, refresh, and links to owned reservation details. Reuse the Step 3
details and payment paths. Add My Bookings to the signed-in guest header when
its route is ready. Verify two guest accounts cannot access each other's data.

Deliver the next step's overview and complete code after EggPie. Apply it after
Pandecoco. The owner runs all checks. Step 5 completes remaining obsolete-link
cleanup, affected test-fixture updates, and contract documentation synchronization.
