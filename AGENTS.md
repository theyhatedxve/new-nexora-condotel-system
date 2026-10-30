# NEXORA — Codex Project Instructions and Development Status

**Last status update:** 2026-10-30
**Authoritative specification:** NEXORA Final Condotel Management System Architecture **v2.1** (approved).
**Current phase:** Phase 3 — Authentication & RBAC **COMPLETED — 8/8 steps** (project-owner accepted).
**Current checkpoint:** Phases 1–3 are complete. Phase 4 onward is **NOT STARTED / AWAITING APPROVAL**. Owner reports 23/23 final acceptance checks passed; no new application checks ran for this documentation update.

> IMPORTANT: This file is a progress handoff and working instructions for Codex. It is not proof that a command ran or a feature exists. Verify the repository before modifying anything. The approved Architecture v2.1 takes precedence over older v2.0 material. Do not infer that the local `Architecture Plan.txt` is v2.1 from its name; inspect the version header.

## 1. Instructions for Codex

1. Follow the **KISS principle**: simple, readable, maintainable code; implement one development step at a time.
2. **Require explicit user approval before each next step/phase.** Phase 3 is accepted complete. Phase 4 and later phases are not started or authorized. This documentation task does not authorize application changes, migrations, or deployment.
3. For a new step: first present the field/relationship design for approval, then provide/implement code only with authorization, then give tests and await results.
4. Prefer **Windows 11 / PowerShell / VS Code** instructions with exact paths, copy-paste code, expected outputs, and troubleshooting.
5. Do not change the approved stack, migrate from Vitest to Jest, or add unnecessary dependencies.
6. Do not store credentials or actual `.env` files in version control. Preserve existing project files and working behavior.
7. Treat the statuses below as based on user reports; independently inspect files/tests when access is available. Never claim runtime database tables or business features work before they have been implemented and tested.

## 2. Approved architecture v2.1

- **System:** NEXORA, one-property condotel management system; modular monolith.
- **Guest web:** React, Vite, **JavaScript/JSX**, React Router, Axios, plain CSS, Lucide React.
- **Admin web:** React, Vite, **JavaScript/JSX**, React Router, Axios, plain CSS, Lucide React.
- **Backend:** NestJS, Express, **TypeScript**, REST API, ESM project setup.
- **Testing:** **Vitest** for NestJS backend. Retain it.
- **ORM:** Prisma 7.10.1 (at last successful installation).
- **Development DB:** SQLite; **production target:** PostgreSQL (requires its own migration/deployment verification).
- **Authentication (Phase 3, complete):** JWT + Passport, Argon2id, rotating hashed refresh families, RBAC, ownership helpers, and optional verified guest registration; acceptance is owner-reported.
- **Payments (later phase):** PayMongo hosted checkout + verified webhooks; Pay at Property.
- **NFC (later phase):** card/credential/device administration; actual hardware to be selected.
- **Business rules:** Guest account optional; no-login booking supported; prevent double booking; separate reservation/payment states; preserve important history; backend-enforced permissions and pricing.

The official v2.1 differs from v2.0 chiefly in **frontends using JavaScript/JSX rather than TypeScript**. Do not let v2.0 override v2.1.

## 3. Repository layout and local commands

Local Windows project location: `D:\Web-JSX\NEXORA`

```text
NEXORA/
├── frontend/
│   ├── guest-web/                   # Vite React JS/JSX, port 5173
│   └── admin-web/                   # Vite React JS/JSX, port 5174
├── backend/                         # NestJS TypeScript, port 3000, Vitest
│   ├── prisma/
│   │   ├── schema.prisma            # 25 current models
│   │   └── migrations/
│   │       ├── 20261027150551_init/migration.sql
│   │       ├── 20261029133315_add_refresh_token_family/migration.sql
│   │       ├── 20261030134255_add_email_verification_tokens/migration.sql
│   │       └── migration_lock.toml
│   ├── src/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── resend-verification.dto.ts
│   │   │   │   └── verify-email.dto.ts
│   │   │   ├── security/
│   │   │   │   └── security-http.spec.ts
│   │   │   ├── auth.config.ts
│   │   │   ├── auth.controller.spec.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.logout.spec.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── email-verification.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── password.service.spec.ts
│   │   │   ├── password.service.ts
│   │   │   ├── registration.service.ts
│   │   │   ├── registration.spec.ts
│   │   │   └── verify-email.dto.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.spec.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.spec.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── ownership/
│   │   │       ├── ownership.module.ts
│   │   │       ├── ownership.service.spec.ts
│   │   │       └── ownership.service.ts
│   │   ├── generated/prisma/        # Generated client, ignored by Git
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── seed.ts              # Guarded development sample data
│   │   ├── app.module.ts            # Prisma, auth, throttling, JWT and role guards
│   │   └── main.ts
│   ├── test/
│   │   ├── database/database.integrity.spec.ts
│   │   └── app.e2e-spec.ts
│   ├── prisma7.config.ts
│   ├── vitest.config.ts
│   ├── vitest.config.e2e.ts
│   └── .env.example
├── docs/
│   ├── DIRECTORY_STRUCTURE.md       # Detailed tree and documentation links
│   ├── AGENTS.md                    # Synchronized copy of this handoff
│   └── NEXORA_ARCHITECTURE_V2.1.md   # Documentation copy of architecture
├── AGENTS.md                        # Repository-wide agent instructions
├── NEXORA_ARCHITECTURE_V2.1.md       # Approved architecture
├── .gitignore
└── README.md
```

See `docs/DIRECTORY_STRUCTURE.md` for the inspected Phase 3 directory map. Keep this root
handoff and `docs/AGENTS.md` synchronized when changing instructions or status.
Local `.env`, SQLite databases, generated clients, and build output are not
source deliverables. Preserve existing local files and unrelated working changes.

GitHub repository: `https://github.com/theyhatedxve/new-nexora-condotel-system`.

From `D:\Web-JSX\NEXORA\backend`:

```powershell
npx prisma validate --config prisma7.config.ts
npm run test -- src/auth/security/security-http.spec.ts
npm run test
npm run build
```

These are examples, not commands executed during this documentation task.
Full Vitest includes existing migrated isolated files step3.auth.test.db,
step6.ownership.test.db, step7.registration.test.db, step8.security.test.db,
and step10.test.db under backend/. Do not substitute dev.db. Tests write
synthetic records in test databases; build writes output. The separate
npm run test:e2e still uses an outdated Hello World! test and must be reviewed
before use. See docs/IMPLEMENTATION_GUIDE.md for command effects/prerequisites.

The seed is `backend/src/prisma/seed.ts`, not `backend/prisma/seed.ts`. Its guards
require `NEXORA_ALLOW_DEV_SEED=true` and `DATABASE_URL=file:./dev.db`. The current
PrismaService adapter uses `file:./dev.db` relative to the backend process working
directory; Prisma CLI configuration reads `DATABASE_URL`. Verify the resolved
CLI and runtime database locations before any migration or seed operation.
Do not run migrations or seeds merely to refresh documentation.

Backend health endpoint: `http://localhost:3000/api/health`. Frontend connectivity
was verified in Phase 1; it was not rerun during this documentation update.

**Prisma schema caution:** Keep complete `@relation(fields: [...], references: [...], onDelete: Restrict)` attributes on one line. Splitting the attribute previously caused Prisma P1012 errors.

## 4. Status checklist — phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Project Foundation | **COMPLETED** (8/8 user-verified) |
| 2 | Database Foundation | **COMPLETED** (10/10, user-confirmed on 2026-10-28) |
| 3 | Authentication & RBAC | **COMPLETED — 8/8 steps** (owner-reported acceptance) |
| 4 | Room Management | NOT STARTED / AWAITING APPROVAL |
| 5 | Guest Website business features | NOT STARTED / AWAITING APPROVAL |
| 6 | Reservation System | NOT STARTED / AWAITING APPROVAL |
| 7 | Payment System | NOT STARTED / AWAITING APPROVAL |
| 8 | Admin Dashboard business features | NOT STARTED / AWAITING APPROVAL |
| 9 | NFC Management | NOT STARTED / AWAITING APPROVAL |
| 10 | Reports & Settings | NOT STARTED / AWAITING APPROVAL |
| 11 | Security & Testing final phase | NOT STARTED / AWAITING APPROVAL |
| 12 | Production Deployment | NOT STARTED / AWAITING APPROVAL |

### Phase 1 — Completed (8/8)

- [x] Windows 11, Node.js, npm, Git, and VS Code environment configured.
- [x] Root folders and approved `frontend/guest-web`, `frontend/admin-web`, `backend`, `docs` organization established.
- [x] Guest Website Vite/React JavaScript project, initial routes and responsive styling.
- [x] Admin Dashboard Vite/React JavaScript project, navigation, placeholder routes/cards, responsive styling.
- [x] NestJS backend and `/api/health` endpoint.
- [x] Frontend-to-backend Axios connectivity and CORS configuration.
- [x] Git repository, GitHub push, `.gitignore`, `.env.example`, README and development rules.
- [x] Phase 1 integration, builds, health checks, and **Vitest** tests passed.

### Phase 2 — Completed (10/10)

Completion was explicitly confirmed by the user on 2026-10-28. The schema,
migration, Prisma integration, seed, and database test source were inspected for
this handoff. Runtime test results, seed execution, and applied migration state
were not independently rerun or verified during this documentation update.

- [x] **Step 1 — Install and Configure Prisma:** Prisma, SQLite adapter, configuration, and Vitest foundation established; earlier checks were reported successful.
- [x] **Step 2 — Establish Database Conventions:** CUID IDs, naming, integer centavos, UTC event timestamps / Asia/Manila display, separate booking/payment states, and history preservation established.
- [x] **Step 3 — Property and Room Models:** `Property`, `RoomType`, `Room`, `Amenity`, `RoomImage`, and `RoomTypeAmenity` defined.
- [x] **Step 4 — User and Guest Models:** `User`, `Role`, `RefreshToken`, and `Guest` defined.
- [x] **Step 5 — Reservation Models:** `Reservation`, `ReservationGuest`, `RoomAssignment`, and `RoomBlock` defined.
- [x] **Step 6 — Payment Models:** `Payment`, `PaymentEvent`, and `Refund` defined.
- [x] **Step 7 — NFC and Administration Models:** `NfcCard`, `NfcCredential`, `CardAssignment`, `DoorDevice`, `AccessLog`, `AuditLog`, and `SystemSetting` defined.
- [x] **Step 8 — Database Migrations and Prisma Client Integration:** Initial migration source contains 24 model tables; generated client exists; `PrismaModule` and `PrismaService` are connected through `AppModule`. Completion is user-confirmed.
- [x] **Step 9 — Initial Test Data:** Guarded seed source at `backend/src/prisma/seed.ts` provides four roles, one demo property, four amenities, three room types, six rooms, and amenity relationships. Execution completion is user-confirmed.
- [x] **Step 10 — Database Testing and Review:** Database integrity suite exists at `backend/test/database/database.integrity.spec.ts`; completion is user-confirmed. No new test pass is claimed here.

### Phase 3 — Completed (8/8)

- [x] **Step 1 — Account and Session Contracts:** Registration, login, refresh, logout, account statuses, token lifetimes, and public/protected routes. See docs/API.md.
- [x] **Step 2 — Password Hashing:** Argon2id service, verification, parameter/salt tests.
- [x] **Step 3 — Login and Refresh Rotation:** ACTIVE-only JWT authentication, 15-minute access tokens, seven-day HttpOnly refresh cookies, hashed credentials, token families, replay detection, and concurrent-claim protection.
- [x] **Step 4 — Logout and Session Revocation:** Current family revocation and matching-cookie clearing; independent device families. Access JWTs may remain valid until expiry while the user remains ACTIVE.
- [x] **Step 5 — Role-Based Guards:** Global throttling/JWT/role guards, @Public(), @Roles(), ADMIN/MANAGER/RECEPTIONIST/GUEST, 401/403 responses, no implicit ADMIN bypass.
- [x] **Step 6 — Ownership Checks:** OwnershipModule and OwnershipService for linked guest profiles and reservations, explicit staff allowlists, cross-guest denial, privacy-preserving 404, and isolated SQLite tests. Future feature services must invoke these helpers.
- [x] **Step 7 — Optional Guest Registration:** Server-assigned GUEST, transactional PENDING User/Guest creation, single-use hashed verification tokens with 30-minute expiry, activation, duplicate protection, resend, and post-commit SMTP delivery.
- [x] **Step 8 — Authentication and Security Testing:** Owner accepted HTTP security and full Vitest regression, NestJS build, Prisma validation, and development database preservation; final result reported 23/23 checks passed with no reported errors.

### Evidence and remaining deployment concerns

The owner supplied completion and successful acceptance results. This task
independently inspected source paths, DTOs, controllers, guards, ownership,
schema, migration SQL, package scripts, and test fixtures. No application tests,
SMTP sends, builds, migrations, or database writes ran during this task.

See docs/SECURITY.md sections 14–15 for the acceptance/check mapping and limits.
The HTTP file contains 17 named cases; the supplied 23/23 describes the overall
acceptance checklist, not 23 named HTTP cases. Real SQLite suites exist for auth,
logout, ownership, and registration; email delivery is faked in registration/HTTP
tests. Do not repeat the older claim that all auth/logout tests use mocks.

Production concerns include GET-link email prefetching, silent SMTP failure
monitoring, duplicate enableCors calls in main.ts, the unhandled bootstrap
promise, the stale separate end-to-end test, and CLI/runtime database path
alignment. The extra src/auth/verify-email.dto.ts is empty; the imported DTO is
src/auth/dto/verify-email.dto.ts. These source findings were not changed and do
not revoke the owner's accepted Phase 3 status.

GET /api/auth-check is a diagnostic route, not a business API. Security-test
routes are fixture-only. Frontends remain starter/placeholder applications;
backend completion does not establish their sign-in integration. Guests may
book without registering when the future booking workflow is implemented.
Preserve all unrelated and uncommitted application work.

## 5. Database model inventory (Architecture v2.1)

Architecture v2.1 specifies **23 main models** plus `RoomTypeAmenity`: **24 models in the accepted Phase 2 foundation**. Phase 3 Step 7 adds `EmailVerificationToken`, giving **25 current Prisma models**. Preserve the approved extension and never overwrite it with the older baseline.

**Property and room models — present in schema and initial migration:**
- [x] `Property`
- [x] `RoomType`
- [x] `Room`
- [x] `Amenity`
- [x] `RoomImage`
- [x] `RoomTypeAmenity` (supporting join model)

**Identity and guest models — present in schema and initial migration:**
- [x] `User`
- [x] `Role`
- [x] `RefreshToken`
- [x] `Guest`

**Reservation, payment, NFC, and administration models — present in schema and initial migration:**
- [x] `Reservation`
- [x] `ReservationGuest`
- [x] `RoomAssignment`
- [x] `RoomBlock`
- [x] `Payment`
- [x] `PaymentEvent`
- [x] `Refund`
- [x] `NfcCard`
- [x] `NfcCredential`
- [x] `CardAssignment`
- [x] `DoorDevice`
- [x] `AccessLog`
- [x] `AuditLog`
- [x] `SystemSetting`

- [x] `EmailVerificationToken` — Phase 3 Step 7; unique tokenHash, User relation with Restrict, expiry/usedAt, userId and expiry indexes.

**Current model count:** 25. The initial migration has 24 models; the two later migrations add refresh family tracking and the verification-token model. Phases 2 and 3 are accepted complete; future business APIs and production compatibility remain unimplemented.

## 6. Remaining work (do not mark complete)

- Future frontend authentication integration and remaining production-hardening concerns; backend Phase 3 is accepted complete.
- Operational room management and live availability calculation.
- Guest no-account reservation workflow, check-in/out, inventory holds, physical room assignments.
- PayMongo checkout, payment webhook verification, Pay at Property, refunds.
- NFC hardware integration, access control, access logs.
- Actual data-powered dashboard metrics, reporting and production deployment.

## 7. The next requested action

Phases 1–3 are complete. Phase 4 — Room Management and subsequent phases are
NOT STARTED / AWAITING APPROVAL. Present the Phase 4 plan only when requested;
obtain explicit approval before implementation. This synchronization does not
authorize application changes, migrations, commits, pushes, or deployments.
Keep root AGENTS.md and docs/AGENTS.md synchronized, preserve Architecture v2.1,
and never record actual secrets, credentials, tokens, or private guest data.
