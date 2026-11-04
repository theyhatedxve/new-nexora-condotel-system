# NEXORA — Implementation Guide

## 1. Working Method

For every implementation step:

1. Inspect the current files.
2. Explain the proposed scope.
3. Obtain approval.
4. Provide the exact file path.
5. State whether to create, replace, or insert content.
6. Provide complete copy-paste code for that change.
7. Explain what the code does.
8. Provide applicable commands.
9. Describe expected results.
10. Record actual results before advancing.

Do not overwrite existing work without reviewing it.

Documentation approval does not authorize all application phases.

## 2. Preflight Review

Current accepted milestones (synchronized 2026-11-01; this table and the final
Step 7.3 record supersede older status narratives):

| Phase | Status |
|---|---|
| Phase 1 | COMPLETED |
| Phase 2 | COMPLETED |
| Phase 3 | COMPLETED — 8/8 steps |
| Phase 4 | COMPLETED — 7/7 steps |
| Phase 5 | COMPLETED — 7/7 steps, owner-confirmed |
| Phase 6 | COMPLETED — 10/10 steps, owner-confirmed |
| Phase 7 | IN PROGRESS — Steps 7.1–7.2 accepted for advancement; Step 7.3 locally verified with an actual verified test receipt; final manual acceptance pending |
| Phases 8–12 | NOT STARTED / AWAITING APPROVAL |

Phase 1 delivered the two React JavaScript/JSX foundations and connected NestJS
API. Phase 2 delivered the 24-model foundation, migrations, Prisma/NestJS
integration, guarded development seed, and isolated integrity tests. Phase 3
added authentication/security and EmailVerificationToken (25 current models).
Phase 4 is completed per owner instruction, with room management, validated image
uploads, shared numeric/date validation, status/blocks, and inventory safety.
The owner reports 23/23 final acceptance checks passed without reported errors,
including HTTP security, full Vitest regression, build, Prisma validation, and
development database preservation. That historical report is separate from
the fresh Step 7.3 checks recorded at the end of this guide.
See [security evidence and limits](SECURITY.md#14-security-acceptance-checks).


Before continuing development:

- Read applicable AGENTS.md instructions.
- Read the authoritative [docs/NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md).
- Reconcile source deviations through [owner review](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items), not by altering the approved baseline.
- Check the existing frontend folder structure.
- Inspect package scripts and locked versions.
- Inspect the Prisma schema and configuration.
- Check current Git changes.
- Identify the latest approved phase and step.

Do not restart completed work based on outdated architecture status text.

## 3. Phase 01 — Project Foundation

**Status: COMPLETED.**

Steps:

1. Verify Node.js and package-manager compatibility.
2. Verify guest React JavaScript/Vite application.
3. Verify admin React JavaScript/Vite application.
4. Verify NestJS TypeScript backend.
5. Configure environment examples.
6. Establish the approved API base path and local CORS.
7. Connect each frontend to a backend health endpoint.
8. Run builds and configured tests.

Pass condition:

Both frontends can reach the backend, and the foundation checks pass.

## 4. Phase 02 — Database Foundation

**Status: COMPLETED.** Accepted deliverables:

1. Prisma and SQLite configuration.
2. Naming, identifier, money, and date conventions.
3. Property and room models.
4. User and guest models.
5. Reservation models.
6. Payment models.
7. NFC and administration models.
8. Migrations and Prisma Client/NestJS integration.
9. Guarded development sample data.
10. Isolated database integrity testing and review.

The original foundation has 24 models. Phase 3 adds token-family tracking and
EmailVerificationToken without replacing the original schema. See
[database schema and migrations](DATABASE_SCHEMA.md). Completion and runtime
results are project-owner accepted; no migration or seed ran for this update.
Schema approval does not authorize a new database migration.

## 5. Phase 03 — Authentication and RBAC

**Status: COMPLETED — 8/8 steps**, accepted by the project owner.

- [x] Step 1 — Account and Session Contracts.
- [x] Step 2 — Password Hashing.
- [x] Step 3 — Login and Refresh Rotation.
- [x] Step 4 — Logout and Session Revocation.
- [x] Step 5 — Role-Based Guards.
- [x] Step 6 — Ownership Checks.
- [x] Step 7 — Optional Guest Registration.
- [x] Step 8 — Authentication and Security Testing.

The implemented contracts include ACTIVE-only JWT sessions, rotating refresh
families, cookie clearing, explicit roles, reusable record ownership, optional
PENDING guest registration, and single-use 30-minute email verification.
[API.md](API.md) defines endpoint details; [SECURITY.md](SECURITY.md) describes
session behavior, acceptance evidence, and production-hardening concerns.

The owner's final 23/23 checks include real HTTP integration and full Vitest
regression, build, Prisma validation, and preserved development data. That is
reported evidence, not a fresh execution here. Backend acceptance does not
establish frontend login screens, accountless booking, full guest/reservation
APIs, real SMTP delivery, or production readiness.

## 6. Phase 04 — Room Management

**Status: COMPLETED — 7/7 steps**, per project-owner instruction on 2026-10-31.
Implementation and test sources were inspected; no fresh tests/build ran here.

- [x] Step 1 — Room-Type Management: active public reads, ADMIN/MANAGER writes,
  property scope, duplicate protection, safe capacity/deactivation changes.
- [x] Step 2 — Physical-Room Management: staff reads, unique room numbers,
  active type membership, protected reclassification/deactivation.
- [x] Step 3 — Amenity Management: catalog writes, public reads, links/detach,
  normalized names, duplicate and permission checks.
- [x] Step 4 — Approved Room Image Uploads: bounded decoded JPEG/PNG/WebP,
  WebP re-encoding, controlled storage/delivery, primary selection and recovery.
- [x] Step 5 — Rate and Capacity Validation: shared integer/centavo bounds,
  guest-capacity checks, reservation price-snapshot preservation.
- [x] Step 6 — Operational States and Dated Room Blocks: permitted role-based
  transitions, real calendar-date ranges, overlap checks, additive canceledAt
  migration, history-preserving cancellation.
- [x] Step 7 — Inventory Safety and Regression Testing: reusable transaction-scoped
  eligibility helper, isolated fixtures for status/block/assignment conflicts,
  snapshots and concurrent assignment safety.

Detailed files, rules, and test targets are maintained in
[AGENTS.md](AGENTS.md#c-completed-project-phases); exact endpoints and DTOs in
[API.md](API.md#5-implemented-room-management-and-availability).
Inventory eligibility does not reserve a room or expose public booking/availability.
Full room-type allocation, hold expiry/acquisition, and connected frontend forms
remain future integration work. Phase 5 Steps 4–5 frontend work remains in progress and Steps 6–7 remain pending;
Phase 6 onward requires explicit approval.

## 7. Phase 05 — Guest Website

**Status: IN PROGRESS — Steps 1–3 complete; Steps 4–5 backend complete, frontend in progress; Steps 6–7 pending.**

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

### Reported backend checks for Steps 4–5

The owner supplied the following implementation report for the availability
endpoint. This is reported evidence from another copy of the repository, not
checks executed during this documentation task:

| Check | Reported result / current evidence |
|---|---|
| Date and inventory rules | Seven quick checks reportedly passed. Named scenarios included free inventory, fully booked inventory, back-to-back stays, a blocked room, two rooms with one reserved, and no rooms. The supplied count is seven; six scenario descriptions were provided. |
| Temporary check file | Reportedly removed after those checks; it is not a permanent regression suite. |
| Permanent availability tests | Promised in a later message; no dedicated availability test file is currently present under backend/src/availability/. Do not mark them complete until supplied and verified. |
| Full NestJS build | Not completed in the reported sandbox because Prisma client generation/download was unavailable. Local build success remains unverified. |
| TypeScript diagnostics | The report mentioned 109 errors in untouched files while generated database types were unavailable. Sandbox causation was reported, not independently established; these diagnostics do not prove the new code is error-free. |
| Local build and lint | Results have not been supplied for this backend milestone. npm run build and npm run lint remain outstanding local verification. |

From D:\Web-JSX\NEXORA\backend, when verification is authorized:

```powershell
npm run build
npm run lint
```

The build writes generated output; lint checks the current source. This task did
not run either command, download/generate Prisma Client, install dependencies,
or modify application files. Preserve backend/dev.db and keep database tests
isolated. Backend implementation remains owner-confirmed complete; the reported
quick checks do not establish a full build or permanent regression pass.
Frontend search and searched-stay pricing integration remain in progress.

## 8. Phase 06 — Reservation System

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Approve hold duration and booking rules.
2. Implement date and capacity checks.
3. Implement concurrency-safe inventory acquisition.
4. Add guest checkout.
5. Add private booking access.
6. Add room assignment history.
7. Add approved lifecycle transitions.
8. Add cancellation.
9. Add check-in/out.
10. Test competing bookings and hold expiration.

Pass condition:

Bookings preserve trusted prices and cannot oversell inventory.

## 9. Phase 07 — Payment System

**Status: IN PROGRESS. Steps 7.1–7.2 accepted for advancement; Step 7.3
installed, locally verified and actual verified test receipt confirmed.
Provider HTTP acknowledgment, manual redelivery and final owner acceptance
remain unconfirmed. Steps 7.4–7.8 have not started.**

Steps:

1. Approve detailed payment records and policies.
2. Integrate PayMongo test-mode checkout.
3. Implement verified webhook handling.
4. Add duplicate-safe processing.
5. Add Pay at Property collections.
6. Add authorized refunds.
7. Reconcile late, duplicate, and failed events.
8. Test provider timeouts and return-before-webhook behavior.

Pass condition:

Only trusted payment evidence changes financial state.

## 10. Phase 08 — Admin Dashboard

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Build staff layout and navigation.
2. Add role-appropriate summary cards.
3. Add reservation and guest screens.
4. Add room and payment operational views.
5. Connect filters and pagination.
6. Verify summary definitions against source records.

Pass condition:

Dashboard figures and actions reflect authorized backend data.

## 11. Phase 09 — NFC Management

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Approve card and credential lifecycle.
2. Build simulated cards and assignments.
3. Build issuance and revocation interfaces.
4. Label simulations visibly.
5. Select compatible hardware.
6. Approve the vendor adapter.
7. Test physical access and expiration.
8. Test lost-card revocation and offline behavior.
9. Document emergency procedures.

Pass condition:

Simulation is verified separately from physical hardware behavior.

## 12. Phase 10 — Reports and Settings

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Approve occupancy and revenue definitions.
2. Implement reports from authoritative records.
3. Add access and audit views.
4. Implement validated settings.
5. Audit policy changes.

Pass condition:

Reports reconcile with underlying data and settings are access-controlled.

## 13. Phase 11 — Testing and Security

**Status: NOT STARTED / AWAITING APPROVAL.**

Verify:

- Complete guest booking journeys.
- Accountless booking access.
- PayMongo and Pay at Property.
- Reservation/payment status separation.
- Inventory contention.
- Role isolation.
- Refund failures.
- NFC failures.
- Upload handling.
- Backup restoration.
- Production-database behavior.

Pass condition:

Critical journeys and failure scenarios pass with recorded evidence.

## 14. Phase 12 — Production Deployment

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Approve hosting and domains.
2. Confirm the production database choice; PostgreSQL is recommended.
3. Test production migrations and data transfer.
4. Configure secrets and HTTPS.
5. Configure durable uploads.
6. Register and verify production webhooks.
7. Configure monitoring and reconciliation.
8. Test backups and recovery.
9. Complete operational training.
10. Obtain launch approval.

Pass condition:

The deployment passes functional, security, integration, and recovery checks.

## 15. Command Guidance

Existing scripts were inspected in backend/package.json. Run from
D:\Web-JSX\NEXORA\backend only after authorizing the relevant checks:

```powershell
npx prisma validate --config prisma7.config.ts
npm run test -- src/auth/security/security-http.spec.ts
npm run test
npm run build
```

These examples do not authorize a full-suite run. Actual Step 7.3 commands and
results are recorded below; Prisma CLI validation/migration was not run. Prisma
validation reads the schema/configuration and does not create tables. The
security command executes the real HTTP suite; npm run test uses Vitest's
**/*.spec.ts selection and includes isolated database suites. Tests mutate
synthetic data in existing migrated test databases; build writes generated
output. Neither command authorizes migration or seeding of development data.

| Existing suite | Required database under backend/ |
|---|---|
| Auth service and logout | step3.auth.test.db |
| Ownership | step6.ownership.test.db |
| Registration | step7.registration.test.db |
| HTTP security | step8.security.test.db |
| Database integrity | step10.test.db |
| Room types, physical rooms, amenities, images | phase4.step1.test.db, phase4.step2.test.db, phase4.step3.test.db, phase4.step4.test.db |
| Rate snapshots, room states/blocks, inventory | phase4.step5.test.db, phase4.step6.test.db, phase4.step7.test.db |

Confirm migrations, client generation, target paths, and synthetic configuration
before an approved test run. Never substitute dev.db for an isolated test file.
HTTP/registration suites use fake email delivery, not production SMTP.

npm run test:e2e selects **/*.e2e-spec.ts separately. The current legacy
app.e2e-spec.ts still expects Hello World! and does not isolate the real Prisma
provider; it is not the accepted HTTP security suite. Review it before use.

Provide each command's working directory, write effects, prerequisites, and
actual output. Custom Prisma CLI configuration is prisma7.config.ts. Do not
claim success from command examples or schema validation alone.

## 16. Step Completion Record

Use this template:

```text
Phase:
Step:
Approved scope:
Files changed:
Checks executed:
Actual results:
Unresolved issues:
Next proposed step:
Approval required before advancement:
```


## Phase 7.3 — Current handoff and verification

On 2026-11-01, all 25 prepared-manifest files were confirmed installed and
byte-identical to the reference package. No application source replacement,
dependency installation, schema change or new migration was needed. The owner
approved verification and updates to this guide and AGENTS.md. Preserve all
other existing working-tree changes. Do not advance to Step 7.4.

Actual local results: **398 distinct tests passed across 25 files**. Backend
type checking/build, guest build and targeted backend/guest lint also passed.
This supersedes the review-copy report of 374 tests. The later manual test
confirmed an actual verified test receipt as detailed below; full browser
acceptance and PostgreSQL behavior remain unverified.

Isolation and working directories:

- The 25 webhook cases ran from the real backend/ and created disposable
  databases with mocked provider calls.
- The five legacy fixtures required by affected regression are present,
  including phase4.step7.test.db, but lack newer checkout columns. Original
  fixtures were inspected for schema only and left untouched. Regression ran
  from a disposable backend copy with identical source and fresh synthetic
  fixtures created using the six existing migration SQL sources. No old
  fixture or development data was copied. Stop a legacy suite if its dedicated
  fixture is missing; never substitute dev.db.
- The regression command excluded the already-run webhook file and added
  inventory safety: 373 tests passed across 24 files, including all 24
  previously unverified inventory cases. This is not a full-suite pass.
- Test processes used an absolute isolated NEXORA_RUNTIME_DATABASE_URL guard;
  no fallback runtime database was created. Neither dev.db was opened by an
  application/test, and both retained their size and modification time.
- Builds wrote generated output only. Lint used no autofix. Temporary test
  databases and the disposable verification copy were removed afterward.

Executed commands (PowerShell uses npm.cmd to avoid the blocked npm.ps1 shim):

```powershell
# Real backend/: disposable webhook fixtures, provider mocked.
npm.cmd run test -- src/payments/paymongo-webhook.http.spec.ts

# Disposable backend copy/: fresh dedicated synthetic fixtures; no dev.db.
npm.cmd run test -- src/payments src/prisma src/reservations src/room-types src/rooms src/room-blocks src/common/validation/room-rate-capacity.spec.ts src/common/inventory/inventory-safety.spec.ts --exclude src/payments/paymongo-webhook.http.spec.ts

# Real backend/: type check and generated build output.
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm.cmd run build

# Real frontend/guest-web/: generated guest build output.
npm.cmd run build
```

Targeted Oxlint checked the 12 installed Step 7.3 backend source/test paths
with --type-aware, plus BookingPayment.jsx, PaymentReturn.jsx and
bookingPaymentsApi.js in the guest frontend. All passed. The legacy
backend/test/app.e2e-spec.ts was not run because it imports AppModule without
isolating Prisma.

Installed behavior is documented in AGENTS.md and API.md: raw-body test
signature verification, exact local/provider/amount/currency matching,
atomic receipt/event/audit writes, duplicate safety, early-payment preservation,
review retention, verified-record consumers and retryable persistence errors.
Basic duplicate safety is mandatory Step 7.3 protection; it does not complete
the expanded Step 7.4 or Step 7.7 work.

Manual setup procedure and acceptance (steps 1–4 exercised; current evidence
and remaining limits follow):

1. Prepare a fresh synthetic runtime database and set its absolute
   NEXORA_RUNTIME_DATABASE_URL in the server's own terminal before startup.
   The existing seed-checkout-demo.mjs accepts only a new absolute path ending
   in phase7.step2.manual.test.db and refuses an existing file. Never run it
   against any dev.db or use a private session from another database.
2. Privately configure backend-only test credentials. PAYMONGO_TEST_WEBHOOK_SECRET
   is the endpoint signing secret, separate from PAYMONGO_TEST_SECRET_KEY.
   Never paste either value into chat, logs or documentation.
3. Expose only the isolated test backend through the chosen reachable endpoint
   and register POST /api/webhooks/paymongo for test-mode
   checkout_session.payment.paid. Do not register a live endpoint.
4. Create checkout through NEXORA, complete a provider test transaction and
   verify backend receipt/event/audit records. Returning to /payment-return
   alone proves nothing; cancelled/expired bookings must never be revived and
   check-in remains a staff action.
5. Verify redelivery does not duplicate collection, record the actual delivery
   outcome without private payloads, and obtain owner acceptance. Step 7.4
   remains outside this task.

No provider registration, real-secret inspection, actual provider payment,
refund, staff collection, migration of development data, commit, push or
deployment was performed during local verification.

Subsequent isolated manual evidence (2026-11-01):

- The guarded initializer created a fresh manual fixture, and the owner started
  the backend with its explicit absolute runtime override. The fixture is
  retained for review. Test credentials were configured privately; local
  diagnostics output only format/presence results and safe error codes.
- The owner confirmed public health access and registered the test webhook.
  Gmail booking-link delivery and private My Booking access were confirmed
  by the owner. No credential, email address, private link or public tunnel
  address is recorded here.
- Read-only database checks found exactly one PAID receipt, one signature-verified
  PROCESSED checkout_session.payment.paid event and one payment.paid audit.
  The installed evidence helper confirmed the exact reference/provider/amount/
  currency/test-mode match, with no review flag. Fixture bookings remained
  CONFIRMED. The owner reported the full-payment message.
- The owner's pasted test checkout has one paid payment and matches the stored
  provider session, local payment reference, provider payment ID, gross amount
  and currency. This validates the supplied checkout against the backend proof,
  rather than treating return URL parameters as payment authority.
- The pasted checkout resource does not include a webhook delivery response
  code. That HTTP acknowledgment and actual manual provider redelivery remain
  unobserved. Automated duplicate/concurrent-client tests passed; they are not
  represented as manual provider replay results.

Next boundary: record any remaining delivery/redelivery observations and final
owner acceptance. Step 7.4 has not started and is not authorized by this task.
No application code, dependency or schema changes were needed for the manual test.
