# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-11-01. Paths are relative to D:\Web-JSX\NEXORA.
**Current checkpoint:** Phases 1–5 are COMPLETED, including Phase 3 (8/8),
Phase 4 (7/7), and Phase 5 (7/7), as confirmed by the project owner.
**Next phase:** Phase 6 — Reservation System; NOT STARTED / AWAITING APPROVAL.

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

Snapshot verified on 2026-10-31 against each package.json, package-lock.json,
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
| 6 — Reservation System | NOT STARTED / AWAITING APPROVAL | Next phase in Architecture v2.1 |
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
not filter hold expiry. Full booking acquisition remains Phase 6 work.

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

## D. Backend Structure

| Location / module | Responsibility |
|---|---|
| backend/src/main.ts | Nest bootstrap, startup rejection handler, cookie parsing, ValidationPipe, CORS, /api prefix, port 3000 |
| backend/src/availability/ | Public search controller/DTO, service, pure nightly calculator; read-only availability and stay-price quote |
| backend/src/app.module.ts | Prisma, auth, room types, rooms/status, amenities, room images, room blocks, availability; global throttling/JWT/roles guards |
| backend/src/auth/ | AuthModule, controller, password/session/registration/verification/SMTP services; DTOs and security tests |
| backend/src/prisma/ | Global PrismaModule, PrismaService, guarded development seed |
| backend/src/room-types/ | RoomTypesModule, controller/service, create/update DTOs, rate-snapshot integration tests |
| backend/src/rooms/ | RoomsModule, room and status controllers/services, room/status DTOs |
| backend/src/amenities/ | AmenitiesModule, catalog and attachment controllers, service, DTOs |
| backend/src/room-images/ | RoomImagesModule, management/public-file controllers, metadata/validation/storage services, update DTO |
| backend/src/room-blocks/ | RoomBlocksModule, controller/service, date/reason DTOs |
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
before running tests; this list does not assert that each fixture is provisioned.

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

## H. Latest System Changes and Documentation Update

| Area / path | Current change or update |
|---|---|
| frontend/guest-web/src/pages/Rooms.jsx | Routed search form now integrates availability requests, validates dates/guest count, resets stale searches, cancels requests and displays server-priced results |
| frontend/guest-web/src/services/availabilityApi.js | Axios availability query with AbortSignal and response-array validation |
| frontend/guest-web/src/styles/availability.css | Search/result presentation and responsive rules used by Rooms.jsx |
| frontend/guest-web/src/hooks/useRoomTypes.js and useRoomDetails.js | Retry actions, stale-response handling and optional media/amenity fallbacks |
| frontend/guest-web/src/pages/RoomDetails.jsx | Connected detail presentation with retry and not-found states |
| frontend/guest-web/src/components/Navbar.jsx | Accessible mobile menu state and Escape/focus handling |
| frontend/guest-web/src/layouts/GuestLayout.jsx | Skip-link target and focus movement after route changes |
| frontend/guest-web/src/styles/global.css | Feedback, keyboard focus, mobile layouts and reduced-motion styling |
| frontend/guest-web/src/components/AvailabilitySearch.jsx and AvailabilitySearch.css | Additional search component files exist; the current routed Rooms.jsx implements its own search form and does not import this component |
| backend/src/availability/ | Existing public query and server quote calculation now have a connected guest-page caller; no new booking write is implied |
| docs/AGENTS.md | Current Phases 1–5 completion, all seven Phase 5 checklist items, installed dependencies, source changes and Phase 6 boundary; consolidated from the former root copy |

Dependency manifests retain the same 62 direct entries; the guest integration
uses the existing Axios/React stack. The schema still has 25 models/four
migrations. Removed superseded frontend-in-progress statements, repeated status
summaries and the long historical sandbox/temporary-test narrative; retained
system requirements, accepted milestones and relevant security/test limitations.

Documentation is consolidated under docs/. The latest root handoff was moved
into this file, replacing the older duplicate; its Phase 5 completion and
dependency inventory are preserved. The duplicate root architecture was removed
after confirming its core requirements match the authoritative docs copy.
Other supporting documents may retain an earlier phase checkpoint until their
next status synchronization.

## I. Next Phase — Phase 6: Reservation System

Architecture v2.1 section 16 places Reservation System after Guest Website and
before Payment System. **Status: NOT STARTED / AWAITING APPROVAL.**

Planned scope from the architecture:

- Guest checkout, with optional accounts and protected accountless access.
- Inventory holds and transaction-safe booking acquisition.
- Physical-room assignments and assignment history.
- Approved booking statuses and lifecycle transitions.
- Cancellation under the property's approved policy.
- Check-in and check-out workflows.

Before implementation, approve the detailed Phase 6 plan, hold duration,
accountless verification and unresolved lifecycle/property policies. Reuse
current ownership, pricing, date and inventory helpers; do not treat a search
result as acquired inventory. The pass condition is trusted stored prices,
authorized private access and booking/assignment writes that cannot oversell.

Phase 7 — Payment System follows Phase 6. PayMongo Hosted Checkout, verified
webhooks, Pay at Property collections and refunds remain future implementation.
No Phase 6 or later code is authorized by this documentation update.

Related references: [API](API.md), [database schema](DATABASE_SCHEMA.md),
[implementation guide](IMPLEMENTATION_GUIDE.md),
[security](SECURITY.md), [directory map](DIRECTORY_STRUCTURE.md), and
[architecture review items](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items).
