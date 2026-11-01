# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-11-01. Paths are relative to D:\Web-JSX\NEXORA.
**Current checkpoint:** Phases 1–5 are COMPLETED, including Phase 3 (8/8),
Phase 4 (7/7), and Phase 5 (7/7), as confirmed by the project owner.
**Current phase:** Phase 6 — Reservation System, IN PROGRESS — **2/10 steps completed**.
Steps 6.1–6.2 are COMPLETED. Step 6.3 — Concurrency-safe inventory acquisition
is APPROVED / IN PROGRESS, handed over to ChatGPT Work and pending completion
verification. Steps 6.4–6.10 are NOT STARTED.
**Next action:** Finish and verify Step 6.3. After its completion is confirmed,
continue to Step 6.4 — Guest Checkout and Booking Forms through source review
and approval before code generation.
Phase 7 — Payment System follows completion of Phase 6 and remains NOT STARTED
/ AWAITING APPROVAL.

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
- Guest accounts are optional; accountless booking is a Phase 6 requirement.
  Phase 5 completion does not establish booking, payment, or NFC operations.
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
| 6 — Reservation System | IN PROGRESS — 2/10 complete | Steps 6.1–6.2 completed; 6.3 approved/in progress, pending verification; 6.4–6.10 not started |
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
not filter hold expiry. Phase 6 now adds an internal acquisition writer and
commitment protections described below; public booking integration remains
unimplemented.

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

### Phase 6 — Reservation System (In Progress — 2/10 Completed)

**Roadmap updated November 1, 2026.** The latest owner-supplied ten-step roadmap
supersedes the earlier handoff that called "Protect Existing Inventory
Commitments" a completed Phase 6 Step 3. That work remains recorded as inspected
code supporting acquisition; it does not confirm completion of Step 6.3.
No tests or final acceptance results establishing Step 6.3 completion have been
reported for this checkpoint. Commit messages and source presence alone do not
establish completion.

#### Development checklist

| Step | Development task | Current status |
|---|---|---|
| 6.1 | Booking policies and hold duration | COMPLETED |
| 6.2 | Reservation date and capacity validation | COMPLETED |
| 6.3 | Concurrency-safe inventory acquisition | APPROVED / IN PROGRESS — handed to ChatGPT Work; pending completion verification |
| 6.4 | Guest checkout and booking forms | NOT STARTED |
| 6.5 | Private booking access | NOT STARTED |
| 6.6 | Physical-room assignment history | NOT STARTED |
| 6.7 | Reservation lifecycle transitions | NOT STARTED |
| 6.8 | Reservation cancellation | NOT STARTED |
| 6.9 | Staff check-in and check-out | NOT STARTED |
| 6.10 | Competing-booking and hold-expiration testing | NOT STARTED |

This preserves the ten-step sequence in
[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md#8-phase-06--reservation-system).
Its older status text is not updated by this AGENTS.md-only task; use the
owner's latest checkpoint above for current progress.

#### Approved booking policies — Step 6.1

| Policy | Approved behavior |
|---|---|
| PayMongo reservation hold | 15 minutes |
| Pay at Property | Automatically confirm when inventory is safely available; confirmation is not proof of payment |
| Hold expiration | Expired pending holds stop consuming inventory immediately |
| Expiration transition | Safely update eligible PENDING reservations to EXPIRED |
| Arrival and no-show cutoff | TBD — requires separate approval |
| Prices | Calculated by the backend and preserved as reservation snapshots |
| Guest registration | Optional; accountless booking must be supported |

Payment processing remains Phase 7. Phase 6 can establish holds and reservation
states; browser redirects and unverified payment events must never establish
payment success. Cancellation fees/refunds and other unresolved policies require
separate approval. Final private-access verification contracts remain to be agreed.

#### Source-inspected foundations — separate from completion acceptance

- **Step 6.2 validation:** CreateReservationDto and ReservationValidationService
  define accountless guest input and validate real Philippine dates, the
  30-night limit, active property/type, room rate and capacity. DTO validation
  rejects undeclared client-supplied price/status fields.
- **Step 6.3 acquisition code present; verification pending:** The internal
  ReservationAcquisitionService revalidates inside a SQLite write transaction,
  creates the guest/reservation together, stores backend price snapshots, and
  checks safe-integer/signed-32-bit totals. HOLD creates a 15-minute PENDING hold;
  CONFIRMED creates a confirmed reservation. Today's new arrivals require READY
  rooms. Eligible expired holds for the selected type transition transactionally
  to EXPIRED; failures roll back expiration, guest and reservation writes.
- **Supporting commitment protection code present:** Room/type/block changes
  check that existing commitments remain allocatable and roll back incompatible
  changes. This includes unassigned bookings; it is supporting Step 6.3 work,
  not an additional completed item in the ten-step roadmap.

Previously inspected commits f9462f6 (reservation foundations) and d296af5
(commitment protection) retain their original test-suite/commit labels.
These labels are historical source references, not new step numbering or
independently verified test results. The owner-supplied roadmap controls the
current development sequence and acceptance status.

#### Supporting inventory-commitment protection behavior

- withInventoryWrite obtains the SQLite write lock through a no-op Property
  update before the callback's inventory reads, then commits checks and writes
  together. SQLite contention retries up to five attempts; exhausted retries
  return ServiceUnavailableException (503). PostgreSQL behavior is not verified.
- assertInventoryCommitments checks CONFIRMED/CHECKED_IN reservations and
  PENDING holds with null or future expiry whose stay has not ended by today's
  Philippine date. It includes unreleased assignments, clips ongoing stays to
  their remaining interval, and checks each connected overlap group separately.
- Room-block creation/edit, MAINTENANCE/OUT_OF_SERVICE transitions, physical-room
  deactivation/reclassification, and room-type capacity reduction/deactivation
  invoke commitment checks after staging the relevant change. Reclassification
  checks both affected types. Canceled blocks are excluded from allocation.
- Releasing an assignment does not cancel the reservation's inventory claim.
  A change can proceed only if other eligible inventory can still honor it;
  fixed unreleased assignments cannot silently move to another room.
- room-allocation.ts evaluates direct and indirect overlaps and feasible rooms
  for complete stays without room moves. Current assignments are constraints;
  this calculation does not persist new assignments or double-count a booking.
  Fragmented nightly capacity can therefore fail even when each night has a
  spare room. Allocation limits (120 connected stays / 200,000 search visits)
  fail closed with a staff-review 503 rather than declaring availability.
- Stored reservation prices survive later rate edits. Existing assignment and
  type-level guards remain in place and can conservatively reject expired
  PENDING records; the new helper's hold-expiry filter does not replace them.

#### Tests and integration boundary

New sources: reservation-validation.spec.ts, reservation-acquisition.spec.ts,
and inventory-write.spec.ts. Their assertions cover DTO/date/capacity rules,
holds and trusted snapshots, independent-client acquisition, rollback,
fragmented/indirect stays, assigned/unassigned commitments, expired holds,
spare inventory, protected administrative changes, and booking-versus-block
contention. rooms.spec.ts and room-blocks.spec.ts now assert that releasing an
assignment alone does not permit invalidating its still-active booking.

The validation suite uses mocked database queries. Acquisition/protection suites
create disposable SQLite databases under backend/.phase6-step3-* and
backend/.phase6-protection-*, apply the checked-in migration SQL there, and clean
up their own fixtures. No tests, migrations, builds or lint ran for this update;
no fresh pass count or production concurrency guarantee is asserted.

No ReservationsModule/controller is registered in AppModule. Internal acquisition
is exercised by tests; existing registered room-management services directly use
the shared protection functions. No public reservation endpoint, browser checkout,
payment, private accountless verification, or assignment/check-in/out API is
established by these additions. A future controller must select trusted policy;
clients must not choose HOLD/CONFIRMED directly. HOLD_DURATION_MS implements the approved 15-minute hold policy. Arrival/no-show
cutoffs, cancellation fees and payment-processing rules are not implied by this
constant and still require their separate approvals.

## D. Backend Structure

| Location / module | Responsibility |
|---|---|
| backend/src/main.ts | Nest bootstrap, startup rejection handler, cookie parsing, ValidationPipe, CORS, /api prefix, port 3000 |
| backend/src/availability/ | Public search controller/DTO, service, pure nightly calculator; read-only availability and stay-price quote |
| backend/src/reservations/ | New accountless input DTO, validation/acquisition services, room-allocation and inventory-write helpers, and three test suites; no public controller/module |
| backend/src/app.module.ts | Prisma, auth, room types, rooms/status, amenities, room images, room blocks, availability; global throttling/JWT/roles guards |
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

- Current schema: 25 Prisma models and four migrations under backend/prisma/.
  The inspected Phase 6 changes add services/helpers/tests, with no schema or
  migration changes; the new logic uses existing Guest/Reservation/Room records.
  Preserve the original foundation and accepted extensions, including
  RefreshToken.familyId, EmailVerificationToken and RoomBlock.canceledAt.
- Migration history: 20261027150551_init,
  20261029133315_add_refresh_token_family,
  20261030134255_add_email_verification_tokens, and
  20261031_phase4_step6_room_block_cancellation.
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
provisioned. The new Phase 6 acquisition/protection suites instead build their
own disposable migrated databases, as described in section C.

## F. Security and Remaining Review Items

- Enforce JWT identity and ACTIVE status in the backend. @Public() does not
  bypass throttling, DTO validation or controller-specific Origin checks.
  ADMIN has no automatic role/ownership bypass. Missing authentication is 401,
  denied role/Origin is 403, and inaccessible private records use 404.
- Auth POSTs require an allowlisted Origin. Refresh cookies are HttpOnly,
  SameSite=Strict, Path=/api/auth and Secure in production. Logout revokes the
  refresh family; an existing access JWT can remain valid until expiry.
- OwnershipModule must be explicitly used by future guest/reservation services;
  helper presence does not protect a future endpoint automatically.
- ADMIN/MANAGER manage room/amenity/image data; reception can read physical rooms
  and blocks. Public room-type/image reads exclude inactive types. Uploads are
  decoded and re-encoded, use guarded storage paths and omit internal file paths.
- **Owner review required:** Architecture v2.1 gives reception room/rate
  management View permission, while RoomStatusService permits READY/CLEANING
  transitions. Preserve both the approved baseline and accurate implementation
  description until the intended housekeeping exception is decided.
- Remaining operational review includes duplicate bootstrap CORS registration,
  deployed cookies/origins, email-link prefetch, SMTP failure monitoring,
  durable image storage/recovery, HTTPS, PostgreSQL compatibility and backups.
- The legacy backend/test/app.e2e-spec.ts expects Hello World! and imports the
  real AppModule without isolating Prisma. Review it before using test:e2e as
  release evidence. Existing model records and admin placeholders do not
  implement payments, check-in/out, reporting or real NFC door access.

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

Source changes inspected in f9462f6 and d296af5:

| Area / path | Added or updated behavior |
|---|---|
| backend/src/reservations/dto/create-reservation.dto.ts | Added accountless guest/stay input contract; prices, role and status are not client input fields |
| backend/src/reservations/reservation-validation.service.ts | Added property/type/date/capacity validation; accepts a transaction client for acquisition |
| backend/src/reservations/reservation-validation.spec.ts | Added mocked validation and DTO rejection coverage |
| backend/src/reservations/reservation-acquisition.service.ts | Added transactional HOLD/CONFIRMED acquisition, expiration handling, guest creation, trusted snapshots and SQLite contention retries |
| backend/src/reservations/reservation-acquisition.spec.ts | Added disposable-database acquisition, concurrency, rollback and allocation coverage |
| backend/src/reservations/room-allocation.ts | Added overlaps, connectedStays and bounded whole-stay assertAllocatable; respects blocks and fixed assignments |
| backend/src/reservations/inventory-write.ts | Added withInventoryWrite, assertInventoryCommitments and assertRoomInventoryCommitments for protected administrative writes |
| backend/src/reservations/inventory-write.spec.ts | Added supporting commitment-protection test source for bookings/holds, rollback, spare capacity, fragmentation and competing writes; not a completed 6.10 acceptance run |
| backend/src/room-blocks/room-blocks.service.ts | Block create/edit now stage changes and recheck room-type commitments in the same serialized transaction |
| backend/src/rooms/room-status.service.ts | MAINTENANCE/OUT_OF_SERVICE transitions recheck commitments and roll back when promised inventory would be lost |
| backend/src/rooms/rooms.service.ts | Deactivation/reclassification now check commitments, including both affected types |
| backend/src/room-types/room-types.service.ts | Capacity reduction/deactivation use shared serialized writes and commitment checks |
| backend/src/rooms/rooms.spec.ts and backend/src/room-blocks/room-blocks.spec.ts | Updated released-assignment expectations: an active reservation still needs inventory |
| docs/AGENTS.md | Updated the current Phase 6 checkpoint, source additions, protection rules, test evidence boundaries and remaining work |

Installed metadata still matches all 62 documented direct dependency entries;
no new dependency is recorded for these changes. The database remains at 25
models/four migrations. Phases 1–5 stay complete. The latest Phase 6 roadmap
records 2/10 completed, Step 6.3 approved/in progress and pending verification,
and Steps 6.4–6.10 not started. Documentation stays under docs/ with only README.md
at the repository root. Other Markdown files are unchanged by this update and
may retain older phase/integration descriptions.

## I. Remaining Phase 6 Roadmap and Next Phase

**Current checkpoint:** 2/10 complete. Step 6.3 was approved and handed over to
ChatGPT Work for implementation; its tests and actual completion results remain
pending verification. The immediate next action is to finish Step 6.3.

| Step | Remaining development scope |
|---|---|
| 6.3 — Concurrency-safe inventory acquisition | Transactional inventory checks and reservation creation; prevent overselling of the last room; verify competing writes, blocking, rollback and hold expiration |
| 6.4 — Guest checkout and booking forms | React/JSX booking form, preserved stay selection, guest information, backend-calculated price review and validation feedback |
| 6.5 — Private booking access | Secure retrieval for registered/accountless guests; a reservation number alone must never authorize private access |
| 6.6 — Physical-room assignment history | Authorized assignment/reassignment, preserved history and prevention of overlapping allocations |
| 6.7 — Reservation lifecycle transitions | Enforce approved PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED and EXPIRED transitions; reject invalid transitions and retain audit-relevant history |
| 6.8 — Reservation cancellation | Permission checks, appropriate future inventory release and history preservation; cancellation fees/refunds require separate policy approval |
| 6.9 — Staff check-in and check-out | Verify assigned rooms and staff authorization; coordinate operational status, cleaning and future NFC revocation integration |
| 6.10 — Reservation regression testing | Competing bookings, expired holds, invalid input, ownership restrictions, protected prices, rollback and preservation of existing functionality |

Existing test files support development; their presence does not mark Step 6.10
started or complete. Keep acquisition verification in Step 6.3 distinct from the
later full reservation regression milestone.

Retain NestJS/TypeScript/Prisma/SQLite in the backend and React/JavaScript/JSX,
Vite, Axios, React Router and plain CSS in the guest frontend. Reuse existing
ownership, pricing, date and inventory helpers. Protect backend/dev.db; tests
must use isolated databases/storage. Review existing source, approve each step,
provide copy-paste-ready code with exact paths when authorized, test, and confirm
completion before advancing. This update changes documentation only.

After Step 6.3 is confirmed complete, the next task is **Step 6.4 — Guest Checkout
and Booking Forms**, starting with source review and approval before generating
code. Continue the remaining Phase 6 sequence before beginning Phase 7.

Architecture v2.1 section 16 places **Phase 7 — Payment System** after Reservation
System. Phase 7 remains **NOT STARTED / AWAITING APPROVAL**: PayMongo Hosted
Checkout/verified webhooks and Pay at Property payment records remain future
implementation. No payment success may be inferred from a browser redirect or
unverified event. No code, migration, installation, commit, push or deployment
is authorized by this documentation update.

Related references: [architecture](NEXORA_ARCHITECTURE_V2.1.md), [API](API.md),
[database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md),
[security](SECURITY.md), [directory map](DIRECTORY_STRUCTURE.md), and
[architecture review items](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items).
