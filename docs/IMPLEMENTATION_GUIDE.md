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

Current accepted milestones (documentation synchronized 2026-10-30):

| Phase | Status |
|---|---|
| Phase 1 | COMPLETED |
| Phase 2 | COMPLETED |
| Phase 3 | COMPLETED — 8/8 steps |
| Phase 4 | COMPLETED — 7/7 steps |
| Phase 5 onward | NOT STARTED / AWAITING APPROVAL |

Phase 1 delivered the two React JavaScript/JSX foundations and connected NestJS
API. Phase 2 delivered the 24-model foundation, migrations, Prisma/NestJS
integration, guarded development seed, and isolated integrity tests. Phase 3
added authentication/security and EmailVerificationToken (25 current models).
Phase 4 is completed per owner instruction, with room management, validated image
uploads, shared numeric/date validation, status/blocks, and inventory safety.
The owner reports 23/23 final acceptance checks passed without reported errors,
including HTTP security, full Vitest regression, build, Prisma validation, and
development database preservation. No fresh application checks ran in this task.
See [security evidence and limits](SECURITY.md#14-security-acceptance-checks).


Before continuing development:

- Read applicable AGENTS.md instructions.
- Read Master Architecture v2.1.
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
[API.md](API.md#5-implemented-room-management-and-planned-availability).
Inventory eligibility does not reserve a room or expose public booking/availability.
Full room-type allocation, hold expiry/acquisition, and connected frontend forms
remain future integration work. Phase 5 onward requires explicit approval.

## 7. Phase 05 — Guest Website

**Status: NOT STARTED / AWAITING APPROVAL.**

Steps:

1. Build shared guest layout.
2. Build homepage.
3. Build room listing and details.
4. Add date and capacity search.
5. Show backend-calculated pricing.
6. Add loading, empty, and failure states.
7. Verify narrow-screen and keyboard behavior.

Pass condition:

Guests can discover eligible rooms with clear prices and usable navigation.

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

**Status: NOT STARTED / AWAITING APPROVAL.**

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
2. Provision production PostgreSQL.
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

These commands were not executed during this documentation task. Prisma
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
