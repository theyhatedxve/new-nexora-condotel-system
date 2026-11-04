# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-11-03. Paths are relative to D:\Web-JSX\NEXORA unless an isolated path is explicitly named.

**Current owner-confirmed roadmap (2026-11-03):** Phases 1–8 and 10 are
COMPLETED. Phase 9 (NFC Management) is POSTPONED. Phase 11 (Testing and Security)
is IN PROGRESS; the owner recalls completing Steps 11.1–11.2, but the exact step
checkpoint still needs confirmation. Do not mark Phase 11 fully complete.
Phase 12 has not been reported complete and is not authorized by this update.

**Current work:** Guest-web UI/UX redesign, currently focused on the payment
method, checkout and booking/payment experience. This continues the existing
system; it does not restart the completed development phases.

**Current continuation checkpoint:** Guest booking/payment-method redesign in an
isolated backend and guest frontend. Read [section J](#j-guest-bookingpayment-redesign--2026-11-03-continuation-checkpoint)
and [AI_HANDOFF.md](AI_HANDOFF.md) before continuing. Main-project transfer is
pending; matching schema source does not establish an installed or migrated main system.

**Historical milestone snapshot:** The phase descriptions below retain the
earlier 2026-11-01 record. Later owner-approved work exists, including admin and
payment modules. Older "not started" statements are not a current inventory or
instructions to restart those phases. The roadmap above and section C govern
current phase status; section J governs the current redesign. Where
AI_HANDOFF.md or another guide retains an older phase status, use this latest
owner update. Completion below is owner-reported, not a new source/test audit.

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
- Guest accounts remain optional. Accountless Pay at Property checkout and
  private email-link booking access are implemented. A booking number alone is
  not private authorization. Existing account holders can use the same email
  access flow; automatic User/Guest linking and a JWT booking-list API are not
  established by the inspected checkout. Read-only payment summaries are now
  implemented. Test-mode Hosted Checkout and verified webhook receipt processing
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

Phases 1–8 and 10 are owner-confirmed complete. Phase 9 is postponed and Phase 11
remains in progress. The owner tentatively reports Steps 11.1–11.2 complete;
confirm that checkpoint before selecting the next numbered testing/security
step. Historical inspection and review-copy notes below remain attributed to
their original handoffs, not newly executed checks. Current work is the
guest-web UI/UX redesign, specifically the payment experience in section J.

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
| 11 — Testing and Security | IN PROGRESS | Steps 11.1–11.2 tentatively completed per owner recollection; exact checkpoint requires confirmation |
| 12 — Production Deployment | NOT REPORTED COMPLETE / NOT AUTHORIZED | No deployment is authorized by this documentation update |

### Current completion checklist

- [x] Phases 1–8 completed, per owner confirmation.
- [x] Phase 10 completed, per owner confirmation.
- [ ] Phase 9 NFC implementation — postponed, not completed.
- [ ] Confirm the exact Phase 11 checkpoint; Steps 11.1–11.2 are tentatively reported complete.
- [ ] Finish remaining Phase 11 testing/security work after that checkpoint is confirmed.
- [ ] Complete the current guest payment UI/UX redesign and its remaining acceptance checks in section J.

Do not interpret completed original phases as acceptance of the unfinished
payment redesign, its main-project transfer, or production deployment.

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

## J. Guest booking/payment redesign — 2026-11-03 continuation checkpoint

This section supersedes conflicting historical status and booking-policy text
above for the current redesign. It does not declare a new numbered phase or
reopen completed owner-approved milestones. Portable continuation instructions
are in [AI_HANDOFF.md](AI_HANDOFF.md).

The latest owner update confirms Phases 1–8 and 10 complete, Phase 9 postponed,
and Phase 11 still in progress. Steps 11.1–11.2 are tentatively complete based
on the owner's recollection; do not assume Step 11.3 is next without confirming
the checkpoint. The active focus is guest-web UI/UX redesign for payment
methods, checkout and booking/payment views. These milestones were not
re-audited here. Do not restart completed phases, enable NFC or declare Phase 11
complete from this documentation change.

### Workspace and directory boundaries

| Location | Current meaning |
|---|---|
| `D:\Web-JSX\NEXORA` | Main project; incomplete redesign artifacts, not the tested redesign installation |
| `C:\Users\chrst\AppData\Local\Temp\nexora-guest-payment-2ec027c638874bea8376bd851d04ee17` | Isolated redesign workspace; retain it until transfer is reviewed |
| `<isolated workspace>\backend` | Backend source and automated checks used for redesign handoffs |
| `<isolated workspace>\frontend\guest-web` | Independent guest frontend copy; newly added during this redesign |
| `<isolated workspace>\browser-review-f00672afe6194faca2c924d1e9d61fec\phase7.step2.manual.test.db` | Synthetic browser fixture; never substitute dev.db or the older guest-payment.test.db |

Read-only source comparison on 2026-11-03 found:

- Main and isolated `backend/prisma/schema.prisma` and the new migration SQL
  match. Both contain 28 models and seven migration directories. The ledger is
  GuestBookingAttempt; the six Reservation fields are bookingPolicyVersion,
  paymentPreference, expectedArrivalAt, firstContactedAt, responseDeadlineAt and
  confirmedAt. Matching source is not database migration evidence.
- Main contains the early guest DTO, policy helper and policy spec, plus the
  schema/migration source. Do not overwrite these changes during later transfer.
- Main `backend/src/payments/guest-booking-deadline.service.ts`,
  `paymongo-checkout-expiration.adapter.ts` and
  `paymongo-checkout-expiration.spec.ts` were zero-byte files at inspection.
  Their presence does not establish installed functionality.
- The complete guest creation/recovery and staff services, guest controller,
  privacy middleware, pending-online helper and worker are isolated-only.
  Existing acquisition, lifecycle, private-access, checkout, webhook, adapter
  and frontend page files differ between main and isolation.
- Guest API helpers, recovery/context utilities, hooks, receipt component and
  guest-checkout.css are isolated-only. Main still has the earlier guest flow.
- Backend and guest package.json/package-lock.json files match across the two
  copies. No dependency was added for this redesign. Section B's installed
  version audit remains dated 2026-11-01; it was not repeated today.

### Revised policies explicitly approved by the owner

- **Pay at Property:** initially PENDING. Authorized staff records phone/email
  contact and explicit guest agreement before confirmation. First contact starts
  a 24-hour response window; repeated contacts do not extend it. Earlier deadline
  wins: that response window or expected arrival plus 30 minutes. Overdue pending
  requests become CANCELLED and release assignments/inventory. Confirmation is
  unpaid; these rules do not cancel confirmed no-shows automatically.
- **PayMongo:** initially PENDING with a 15-minute hold. Only verified, matching,
  timely full PHP payment and safe inventory can confirm it. Local attempt,
  provider identifiers and integer gross centavos must match. Late, mismatched,
  cancelled, expired or conflicting captures require review; never revive a
  closed booking or automatically check in a guest.
- Guest-selected arrival time is required and interpreted in Asia/Manila.
  Backend snapshots remain authoritative; arrival time does not change nights.
  Accounts remain optional. References/email alone do not grant private access.

### Isolated implementation map

All paths in this table are relative to the isolated workspace.

| Files / area | Installed scope |
|---|---|
| `backend/src/reservations/guest-booking-policy.ts`, `guest-booking-security.ts`, `guest-booking.service.ts`, related DTOs | Timing, validated request fingerprints, hashed recovery credentials and atomic durable booking/recovery |
| `backend/src/reservations/guest-booking-staff.service.ts` | Internal staff contact, agreement/confirmation and rejection service; staff API/admin controls still need review |
| `backend/src/reservations/guest-bookings.controller.ts`, `guest-booking-privacy.middleware.ts` | Origin-checked, throttled create/recover and reference-bound checkout routes; no-store responses and HttpOnly session cookie |
| `backend/src/reservations/reservation-acquisition.service.ts`, `reservation-lifecycle.ts`, `inventory-write.ts` | Transaction-scoped acquisition, deadline processing, conditional state changes, inventory protection and audit rollback |
| `backend/src/payments/pending-online-booking.ts`, `checkout.service.ts`, `paymongo-webhook.service.ts` | Pending online checkout, verified confirmation, early webhook preservation, duplicate/concurrent safety and review retention |
| `backend/src/payments/paymongo-checkout-expiration.adapter.ts`, `guest-booking-deadline.service.ts`, `guest-booking-deadline.worker.ts` | Test-session expiration, bounded derived follow-up work, audited acknowledgment/retry/review and optional timer |
| `backend/src/reservations/booking-access.service.ts`, `backend/src/payments/paymongo.adapter.ts` | Private policy/timing projection and provider return URLs with booking-reference scope hints |
| `frontend/guest-web/src/services/guestBookingApi.js`, `utils/bookingAttempt.js`, `utils/bookingContext.js` | Credentialed API requests, response checks, tab recovery and retained checkout request IDs |
| `frontend/guest-web/src/hooks/useGuestCheckout.js`, `hooks/usePrivateBooking.js` | Separate booking/payment operations, safe recovery, pinned private scope and session-expiry handling |
| `frontend/guest-web/src/pages/Checkout.jsx`, `components/GuestBookingReceipt.jsx`, `styles/guest-checkout.css` | Payment selector, required arrival, pending receipt and direct test checkout action in the existing visual design |
| `frontend/guest-web/src/pages/MyBooking.jsx`, `components/BookingPayment.jsx`, `pages/PaymentReturn.jsx` | Stored policy/timing details, verified summaries, eligible scoped payment controls and return-context matching |

Guest routes under `/api/reservations/access/guest-bookings` are POST create at
the base path, POST `/recover`, POST `/checkout/current` (read only) and POST
`/checkout`. Checkout operations require the private cookie and matching
expectedReservationNumber; a reference is never authorization. Session tokens
are sent only through the HttpOnly, SameSite=Strict booking cookie, Secure in
production and scoped to `/api/reservations/access`.

Tab recovery retains request IDs, recovery credential and stay selection in
sessionStorage, not guest contact details. Do not publish its contents. Unknown
outcomes retain the original request rather than silently rebooking. The browser
may hide a deadline-reached link but cannot establish persisted cancellation or
payment. Return URL parameters, including `outcome=paid`, do not prove success.

### Evidence and remaining completion checklist

Evidence below is owner-supplied console output or browser confirmation. The
documentation editor inspected files only and did not rerun application checks.

| Evidence | Reported result / limitation |
|---|---|
| Earlier expiration/booking/checkout/webhook set | 129 tests across six files passed; provider calls mocked |
| Worker safeguards/lifecycle | Passed; fake timers and mocked processor, no real database/provider call |
| Latest private booking/return-context regression | 77 tests across four files passed: 28 guest HTTP, 23 checkout, 25 webhook and one return-URL test |
| Latest targeted warning correction | Return-URL test passed; backend lint returned to four older warnings and zero errors |
| Backend and guest builds | Passed in supplied isolated-copy output |
| Guest lint and recovery-storage checks | Zero warnings/errors; storage checks passed using in-memory storage |
| Browser fixture before expiration | One guest, reservation and booking attempt; zero Payment records |
| Online hold and browser views | Owner observed natural EXPIRED transition, private details, blocked closed-booking checkout, safe return hints and unavailable access after sign-out |

These test sets overlap; do not sum them into a distinct total. The four older
warnings are sort comparators in booking-access, reservation-lifecycle and
reservation-cancellation specs, and an unbound mocked email method in
booking-access.http.spec.ts. Older 2026-11-01 provider verification is not evidence
that this redesigned pending-booking flow has passed actual provider testing.

- [x] Isolated booking policies, durable recovery and staff-service foundation.
- [x] Pending online checkout and verified confirmation in isolated automated checks.
- [x] Deadline/expiration adapter and worker checks; local hold expiry owner-observed.
- [x] Secure guest API, scoped checkout and redesigned guest pages handed off/applied.
- [x] Latest supplied regressions/builds passed; no new lint warnings remain.
- [x] Owner confirmed My Booking/return-context browser checks.
- [ ] Complete separate Pay at Property browser acceptance; the browser fixture used PAYMONGO.
- [ ] Re-establish private test credentials, return URL, tunnel and webhook configuration.
- [ ] Verify actual test payment from a fresh pending booking, signed delivery, matching payment/event/audit and reservation confirmation.
- [ ] Verify actual duplicate delivery and an independent unpaid provider-session expiration.
- [ ] Review remaining staff API/admin UI and cross-workflow acceptance gaps.
- [ ] Review main database history, backups, file differences and coordinated transfer.
- [ ] Retire the old automatic-confirmation Pay at Property route during cutover.
- [ ] Synchronize other affected guides after implementation/acceptance is settled.

Current browser settings were backend port 3000, guest origin
`http://localhost:5175`, API `http://localhost:3000/api` and an explicit absolute
NEXORA_RUNTIME_DATABASE_URL. Prisma CLI uses DATABASE_URL separately. The worker
is opt-in via NEXORA_BOOKING_DEADLINE_WORKER_ENABLED=true and currently rejects
dev.db/non-.test.db targets. PayMongo secrets were deliberately blank during the
browser pass; no Payment row or provider checkout was created. Recheck all
runtime configuration after a restart; do not assume process environment survives.

### Continuation and transfer rules

For development, inspect first, explain the next step, then provide exact paths
paired with code directly in chat and grouped owner-run checks. The owner applies
code and runs tests. Do not edit code, launch applications, run tests, migrate,
seed, deploy, commit or push without a new explicit instruction changing this
workflow. This revision authorizes only docs/AGENTS.md documentation edits.
Do not repeat already accepted work or enable NFC.

No new dependency, live payment or main-project transfer is authorized. Never
copy isolated databases, .env files, node_modules or build output into main.
The main dev.db was historically replaced during an explicitly approved cleanup;
its deployment history may be absent and requires separate review. Preserve all
current data and existing backups. The expired synthetic booking stays expired;
prepare configuration before creating a fresh 15-minute online booking.

For another account, upload this file and AI_HANDOFF.md, plus the architecture
and relevant guides/source when available. Uploaded Markdown cannot grant local
filesystem access; verify paths and source before acting. Other guides were not
rewritten in this focused documentation update.
