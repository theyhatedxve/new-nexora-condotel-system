# NEXORA — Development Reference and Completion Checklist

**Last synchronized:** 2026-10-31. Paths below are relative to D:\Web-JSX\NEXORA.
**Current checkpoint:** Phases 1–4 and Phase 5 Steps 1–3 are complete. Phase 5
Steps 4–5: backend complete; frontend in progress. Steps 6–7 remain pending.
Phase 6 onward is
NOT STARTED / AWAITING APPROVAL. This is documentation maintenance,
not authorization to implement, migrate, install, commit, push, or deploy.

## A. Project Identity

- NEXORA is a one-property Condotel Management System, a modular monolith.
- Architecture v2.1 remains the approved baseline. Preserve original design
  decisions; current contracts/schema are documented in docs/API.md and
  docs/DATABASE_SCHEMA.md rather than inferred from historical examples.
- Development environment: Windows 11, VS Code, PowerShell. Commands below use
  the existing npm projects in backend/, frontend/guest-web/, and frontend/admin-web/.
- Backend: NestJS/Express, TypeScript, ESM, Prisma 7, SQLite development database.
  PostgreSQL is the production target requiring its own migration/acceptance work.
- Both frontends: React, JavaScript/JSX, Vite, React Router, Axios, plain CSS,
  Lucide React. Do not introduce frontend TypeScript or replace Vitest with Jest.
- Guest accounts are optional. Accountless booking remains required when booking
  is implemented; backend registration does not make booking operational.
- Never publish credentials, actual .env contents, raw tokens, password hashes,
  SMTP secrets, private guest data, or database/backup contents in documentation.

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
@types/multer and sharp support the room-image module. No package was installed,
removed, or upgraded for this documentation task.

Reproduce from each application's directory in PowerShell:

```powershell
node --version
npm --version
npm ls --depth=0
```

Compare installed metadata with that application's lockfile. Do not run npm
install merely to inspect versions. package.json ranges alone are insufficient.

## C. Completed Project Phases

| Phase | Status | Evidence basis |
|---|---|---|
| Phase 1 — Foundation | COMPLETED | Owner-accepted foundation; React apps, API health, manifests/configuration inspected |
| Phase 2 — Database Architecture | COMPLETED | Owner-accepted foundation; schema, adapter, migrations, seed, isolated test source inspected |
| Phase 3 — Authentication and Authorization | COMPLETED — 8/8 steps | Owner's previously reported 23/23 acceptance; current source/tests inspected |
| Phase 4 — Room Management | COMPLETED — 7/7 steps | Owner's completion instruction; all seven implementation areas and test source inspected |
| Phase 5 — Guest Website | IN PROGRESS — Steps 1–3 complete; Steps 4–5 backend complete, frontend in progress; Steps 6–7 pending | Owner-confirmed; source/integration limits below |
| Phase 6 onward | NOT STARTED / AWAITING APPROVAL | Future business implementation is not authorized by this task |

Checked implementation items below describe repository source and accepted
milestones. No application test suite, build, migration, seed, database query,
or SMTP send ran in this documentation task. No fresh pass count is claimed.

### Phase 1 — Foundation

- [x] Separate React/Vite guest and admin starter applications with navigation,
  styles, Axios clients, environment examples, and backend status components.
- [x] NestJS TypeScript API and public GET /api/health, global /api prefix,
  development CORS configuration, package scripts, Git and documentation foundations.
- [x] Foundation build/connectivity results previously owner-confirmed. Frontend
  sign-in screens and connected operational management screens are not implied.

### Phase 2 — Database Architecture

- [x] Prisma/SQLite setup; CUID identifiers, PascalCase models/camelCase fields,
  centavo money amounts, Philippine date labels, UTC event timestamps.
- [x] Property/room, identity/guest, reservation, payment, NFC, audit, and settings
  schema: original 24 models including RoomTypeAmenity.
- [x] Initial migration, Prisma generated-client/NestJS provider integration,
  guarded development seed, isolated database integrity tests and review.
- [x] Phase 3 added EmailVerificationToken (25 current models); Phase 4 added
  RoomBlock.canceledAt without increasing the model count. See section E.

### Phase 3 — Authentication and Authorization (8/8)

- [x] Step 1 — Account and Session Contracts: registration/login/refresh/logout,
  PENDING/ACTIVE/DISABLED account states, public/protected route contracts.
- [x] Step 2 — Password Hashing: Argon2id service, verification, salt/parameter tests.
- [x] Step 3 — Login and Refresh Rotation: ACTIVE-only JWTs, 900-second access
  lifetime, seven-day HttpOnly refresh cookies, hashed credentials, independent
  login families, replay detection, transactional concurrent-consumption protection.
- [x] Step 4 — Logout and Session Revocation: current family revocation and cookie
  clearing; other device families remain separate. Access JWTs may remain valid
  until expiry while the user is ACTIVE; logout does not blacklist them.
- [x] Step 5 — Role-Based Guards: global throttle/JWT/roles guards; @Public(),
  @Roles(), explicit ADMIN/MANAGER/RECEPTIONIST/GUEST permissions, no ADMIN bypass.
- [x] Step 6 — Ownership Checks: OwnershipModule/OwnershipService, linked guest and
  reservation checks, explicit staff allowlists, private 404 responses, isolated tests.
- [x] Step 7 — Optional Guest Registration: server-assigned GUEST; transactional
  PENDING User/Guest/token creation; hashed 30-minute single-use verification;
  activation, duplicate protection, resend, post-commit SMTP delivery.
- [x] Step 8 — Authentication and Security Testing: owner previously reported
  23/23 acceptance checks, full Vitest regression, NestJS build, Prisma validation,
  and preserved development data. The HTTP fixture has 17 named cases; do not
  equate that file's case count with the owner's overall acceptance checklist.

Important files: backend/src/auth/, backend/src/common/guards/,
backend/src/common/decorators/, backend/src/common/ownership/. API endpoints:
POST /api/auth/register, GET /api/auth/verify-email,
POST /api/auth/resend-verification, POST /api/auth/login,
POST /api/auth/refresh, POST /api/auth/logout. GET /api/auth-check is diagnostic;
/api/security-test/* exists only in test fixtures. Auth DTOs and detailed
responses/rate limits are in docs/API.md; acceptance boundaries in docs/SECURITY.md.

### Phase 4 — Room Management (7/7)

- [x] **Step 1 — Room-Type Management:** RoomTypesModule/controller/service and
  create/update DTOs in backend/src/room-types/. Public active-type list/detail;
  ADMIN/MANAGER creation/update. Exactly one configured property is required.
  Duplicate names conflict; deactivation/capacity reduction checks protected
  upcoming reservations. room-types.spec.ts uses phase4.step1.test.db.
- [x] **Step 2 — Physical-Room Management:** RoomsModule/RoomsService in
  backend/src/rooms/. Staff list/detail; ADMIN/MANAGER creation/update; unique
  trimmed room numbers, active room-type membership, defaults READY/active.
  Reclassification/deactivation cannot displace protected unreleased assignments.
  rooms.spec.ts uses phase4.step2.test.db; authorization tests inspect role metadata.
- [x] **Step 3 — Amenity Management:** AmenitiesModule with catalog and room-type
  attachment controllers. Public reads; ADMIN/MANAGER writes/detach. Normalized
  names, case-insensitive duplicate check, composite join identity, explicit 404/409.
  amenities.spec.ts uses phase4.step3.test.db; authorization source is present.
- [x] **Step 4 — Approved Room Image Uploads:** RoomImagesModule, ImageValidationService,
  ImageStorageService, and DTO in backend/src/room-images/. One multipart file,
  5 MiB maximum, decoded JPEG/PNG/WebP, 20-million-pixel input limit, re-encoded
  WebP without copying source metadata. Controlled public file delivery, primary
  image selection/replacement, staged deletion and failure recovery. Real storage
  tests use phase4.step4.test.db and temporary storage; role tests are present.
- [x] **Step 5 — Rate and Capacity Validation:** RoomRateCapacityService in
  backend/src/common/validation/ enforces integer capacity/rate in 1..2147483647;
  amounts are centavos, not floating-point currency. Guest count cannot exceed
  capacity. Updating current room rates does not rewrite Reservation's stored
  nightlyRateCentavos/totalAmountCentavos. Unit tests and phase4.step5.test.db
  snapshot integration tests exist.
- [x] **Step 6 — Operational States and Dated Room Blocks:** RoomStatusController/
  RoomStatusService and RoomBlocksModule. Manual statuses exclude OCCUPIED;
  reception may only switch READY/CLEANING; ADMIN/MANAGER can make permitted
  manual transitions. Checked-in assignments are protected. Philippine calendar
  dates use arrival-inclusive/end-exclusive ranges. Blocks reject active-block
  overlaps and protected unreleased assignment overlaps. Cancellation preserves
  the row via canceledAt; canceled blocks cannot be edited or canceled twice.
  Additive migration: 20261031_phase4_step6_room_block_cancellation.
  Room-block tests use phase4.step6.test.db; authorization source is present.
- [x] **Step 7 — Inventory Safety and Regression Testing:** InventorySafetyModule/
  InventorySafetyService in backend/src/common/inventory/. Checks property scope,
  active room/type, matching category, capacity, operational status, active dated
  blocks, and overlapping protected unreleased assignments. IMMEDIATE requires
  READY and dates including today in Asia/Manila; FUTURE can permit CLEANING or
  OCCUPIED when no dated conflict exists, but rejects MAINTENANCE/OUT_OF_SERVICE.
  phase4.step7.test.db tests include adjacent dates, canceled blocks, snapshots,
  and a test-only concurrent assignment writer that commits at most one conflict.

Step 7 is a reusable eligibility service, **not a public availability or booking
endpoint**. assertEligible() is read-only and reserves nothing; future assignment
writers must call assertEligibleInTx() within the same transaction as the write.
excludeReservationId is a trusted internal exception, not public input. Current
checks conservatively protect PENDING assignments without filtering hold expiry;
unassigned room-type inventory/holds and complete booking concurrency remain
future integration work. No independent Phase 4 test run/pass count is available
from this task; test-source presence does not prove production readiness.

### Phase 5 — Guest Website (3 fully completed steps; 2 partially complete)

- [x] **Step 1 — Shared Guest Layout:** GuestLayout renders navigation, backend
  status, outlet, footer, and a skip link. Navbar supports a collapsible menu;
  styles/tokens.css and global.css supply shared visual foundations.
- [x] **Step 2 — Homepage:** Home.jsx provides the NEXORA hero, feature cards,
  room-browsing calls to action, and links to /rooms.
- [x] **Step 3 — Room Listing and Details:** /rooms uses useRoomTypes and RoomCard;
  /rooms/:id uses useRoomDetails, galleries, and amenities. roomTypesApi.js fetches
  public room types, images, and amenities; hooks suppress stale responses.
- [ ] **Step 4 — Date and Capacity Search: PARTIALLY COMPLETE.** Backend complete,
  owner-confirmed: AvailabilityModule exposes GET /api/availability with checkIn,
  checkOut, and guests; validates dates/capacity and accounts for active inventory,
  dated blocks, and inventory-holding reservations. Frontend date/guest inputs,
  availability requests, results, and integration remain in progress.
- [ ] **Step 5 — Backend-Calculated Pricing Display: PARTIALLY COMPLETE.** Backend
  complete, owner-confirmed: AvailabilityService returns nights, nightlyRateCentavos,
  and totalAmountCentavos. Current cards/details display baseRateCentavos per night
  using formatMoney.js; displaying the searched-stay quote in the frontend remains
  in progress. A nightly-rate display is not completion of the whole step.
- [ ] **Step 6 — Loading, Empty, and Failure States:** Pending overall acceptance.
  Existing messages and optional image/amenity fallbacks are partial implementation
  evidence, not confirmation that the full step is complete.
- [ ] **Step 7 — Responsive and Keyboard Verification:** Pending. Navigation
  attributes, skip links, focus styles, and responsive CSS exist; no new browser
  or keyboard acceptance pass was performed in this documentation task.

**Evidence and next work:** The owner's latest clarification supersedes earlier
5/7 completion claims: only Steps 1–3 are fully complete. Backend portions of
Steps 4–5 are complete; their frontend portions are still in progress. Current
Rooms.jsx and RoomDetails.jsx have no date/guest search form, availability API
request, or searched-stay total. roomTypesApi.js currently fetches room metadata
only. No dedicated availability test file or frontend test script was found;
this documentation task ran no application tests, builds, migrations, or seeds.

Availability is informational and reserves nothing. The nightly capacity check
does not prove one physical room is available for a whole stay or acquire
inventory. Complete allocation and booking writes remain Phase 6 scope.
Finish frontend integration for Steps 4–5, then complete/verify Steps 6–7 under
the approved workflow. Phase 5 remains in progress; Phase 6 onward is
NOT STARTED / AWAITING APPROVAL.

### Latest backend availability verification report

For Phase 5 Steps 4–5, the owner reports seven quick date/inventory checks passed
in another repository copy and the temporary test file was removed. Permanent
availability tests were promised separately and are not present in the inspected
availability directory. The report did not complete the full build because
Prisma-generated types could not be obtained in that sandbox. Its 109 reported
TypeScript diagnostics do not independently establish whether the new code is
correct. Local npm run build and npm run lint results remain outstanding.

This task recorded that report without executing those checks or generating a
Prisma client. Full details and safe command context are in
docs/IMPLEMENTATION_GUIDE.md under Reported backend checks for Steps 4–5.
Steps 4–5 backend implementation is complete per owner confirmation; frontend
integration is still in progress. Do not mark permanent tests, full build/lint,
frontend completion, or the entire Phase 5 complete from this report alone.

## D. Backend Structure

| Location / module | Responsibility |
|---|---|
| backend/src/main.ts | Nest bootstrap, startup rejection handler, cookie parsing, ValidationPipe, CORS, /api prefix, port 3000 |
| backend/src/availability/ | Public search controller/DTO, service, pure nightly calculator; read-only availability and stay-price quote |
| backend/src/app.module.ts | Prisma, auth, room types, rooms/status, amenities, room images, room blocks; global throttling/JWT/roles guards |
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

- Prisma CLI/client/adapter are 7.10.1. SQLite runtime uses PrismaBetterSqlite3.
  PrismaService hardcodes file:./dev.db relative to the process working directory:
  run from backend/ to target D:\Web-JSX\NEXORA\backend\dev.db. A nearby source
  comment still says prisma/dev.db; the literal adapter setting is authoritative.
- CLI config is backend/prisma7.config.ts; schema path prisma/schema.prisma,
  migration path prisma/migrations/, datasource from DATABASE_URL. Verify the
  resolved CLI path matches the intended database; never assume a relative URL
  has the same base as the runtime adapter. Do not print actual environment values.
- Four inspected migrations: 20261027150551_init (24 models),
  20261029133315_add_refresh_token_family (nullable familyId/index),
  20261030134255_add_email_verification_tokens (25th model), and
  20261031_phase4_step6_room_block_cancellation (nullable canceledAt; existing
  rows remain active). No migration was applied during this documentation task.
- Follow an additive migration policy: inspect schema and SQL, approve each
  change/target, test on disposable data, retain history, validate compatibility,
  back up, and verify results. Never reset, overwrite, replace, or seed backend/dev.db
  during ordinary testing. Production PostgreSQL requires separate verified SQL.
- Existing local backups/ and database backups are not source artifacts or proof
  that restoration works. Before an approved database change, take a consistent
  SQLite backup using the SQLite backup API or an approved offline procedure
  accounting for WAL/journal files. Verify integrity_check returns ok on a
  read-only connection to the backup and confirm restoration on a disposable copy.
  Record safe hashes/counts when authorized, without exposing private rows.
- Preserve stored reservation price snapshots. RoomBlock.canceledAt (one l)
  preserves canceled history; active inventory checks require canceledAt: null.
  Transactional room/block changes protect relevant assignments; a database index
  alone does not enforce interval exclusion or guarantee full booking safety.

| Test area | Existing migrated isolated database under backend/ |
|---|---|
| Auth/login/logout | step3.auth.test.db |
| Ownership | step6.ownership.test.db |
| Registration | step7.registration.test.db |
| HTTP security | step8.security.test.db |
| Foundation integrity | step10.test.db |
| Room types / physical rooms / amenities | phase4.step1.test.db / phase4.step2.test.db / phase4.step3.test.db |
| Images / rate snapshots | phase4.step4.test.db / phase4.step5.test.db |
| Status/blocks / inventory regression | phase4.step6.test.db / phase4.step7.test.db |

These names are inspected test targets, not a claim that each local file is
currently provisioned or migrated. Suites check isolation from dev.db. Tests
write synthetic records and image tests use temporary filesystem storage.

## F. Authentication and Security Rules

- JWT identity and current ACTIVE status are backend-enforced. @Public() bypasses
  JWT/roles, not throttling or DTO validation. ADMIN has no implicit role or
  ownership bypass. Missing authentication is 401; wrong role/Origin is 403;
  inaccessible private records use 404. Staff permissions must be explicit.
- Auth POSTs require a configured allowlisted Origin. Email verification GET is
  public without that Origin check, consumes a single-use credential, and sets
  no-store/no-referrer headers. Refresh cookies are HttpOnly, SameSite Strict,
  scoped to /api/auth, Secure in production; raw credentials never enter JSON.
- Room/amenity/image writes require ADMIN or MANAGER. Physical-room/block reads
  also permit RECEPTIONIST. Reception's status permission is limited by service
  transitions. Public reads hide inactive room types and their images/links.
- Uploads validate decoded content rather than filenames/MIME alone; SVG and
  unsupported/corrupt images fail. Storage uses generated keys and guarded paths,
  outside a blanket static directory. Public responses omit internal file paths.
- main.ts still registers CORS twice; startup now uses void bootstrap().catch
  and sets a failing process exit code on rejection. The legacy test/app.e2e-spec.ts still expects Hello World!; it does not
  isolate Prisma. Do not confuse it with the accepted HTTP security suite.
- Production work includes email-prefetch-safe verification, SMTP failure
  monitoring, durable image storage and orphan/pending-delete recovery, HTTPS,
  deployed CORS/cookie checks, PostgreSQL compatibility, backups and observability.
  backend/.env.example currently only documents PORT and omits other required
  configuration names; no environment file was changed here.

## G. Coding Standards and Development Workflow

1. Follow KISS: readable TypeScript, clear responsibilities, focused Nest modules,
   minimal dependencies; preserve the approved JavaScript/JSX frontends.
2. Use ESM .js suffixes for local backend TypeScript imports; use import type for
   type-only dependencies. Preserve Vitest and existing package scripts.
3. Validate untrusted DTOs and enforce rules in services. Use integer centavos,
   explicit projections, restrictive historical FKs, transactions and safe errors.
   Never trust client prices, roles, property scope, or record ownership.
4. Use the shared date/rate/capacity/inventory helpers instead of duplicating
   authoritative rules. Snapshot price fields are not current-rate calculations.
5. Inspect existing working changes; propose scope, obtain specific approval,
   implement only that scope, run meaningful isolated checks, review diff, record
   actual results, update documentation, and request approval before advancing.
6. Test fixtures must use dedicated databases/storage. Review generated migration
   SQL and protect development data before any authorized database change.
7. Give Windows PowerShell instructions with working directory, prerequisites,
   write effects, expected outputs, and troubleshooting. Do not claim execution
   from command examples. No destructive reset, auto-commit, push, or deployment.

Existing backend commands (not run for this documentation update):

```powershell
Set-Location D:\Web-JSX\NEXORA\backend
npx prisma validate --config prisma7.config.ts
npm run lint
npm run test -- src/common/inventory/inventory-safety.spec.ts
npm run test
npm run build
```

Validation/lint read sources; tests mutate isolated fixture databases/storage;
build writes output. Provisioning/migrating test files is a separate approved
operation. npm run test:e2e selects the stale legacy fixture separately and
must be reviewed before use. Frontend directories provide dev/build/lint/preview
scripts; no frontend test script is declared.

## H. Current Project Status and Next Boundary

Phases 1–4 are complete as directed by the project owner on October 31, 2026.
Phase 4 has seven completed steps; source and test fixtures substantiate the
listed implementation areas. Application tests/builds were not rerun here and
no new successful-test count is inferred.

Phase 5 is IN PROGRESS: Steps 1–3 are complete; Steps 4–5 have completed backend
work and frontend work in progress. Steps 6–7 remain pending.
The guest website now has a shared layout, homepage, connected room listing and
detail screens. Search-form/stay-total integration is not evident in current
frontend source. Phase 6 onward is NOT STARTED / AWAITING APPROVAL.
Existing guest/admin screens do not establish connected booking,
payments, financial reporting, check-in/out, or NFC door hardware functionality.
Inventory helpers reserve nothing. The new public availability endpoint is
informational and exposes no booking-write operation.

Maintain docs/AGENTS.md and the root AGENTS.md consistently. docs/README.md is
exclusively the product overview: no phase tables, completion logs, test counts,
or development checklists. Use docs/IMPLEMENTATION_GUIDE.md for progress and
commands, docs/API.md for contracts, docs/SECURITY.md for controls/limits,
and docs/DATABASE_SCHEMA.md for the current 25-model schema and migration history.
