# NEXORA — Codex Project Instructions and Development Status

**Last status update:** 2026-10-30
**Authoritative specification:** NEXORA Final Condotel Management System Architecture **v2.1** (approved).
**Current phase:** Phase 3 — Authentication & RBAC **IN PROGRESS** (implementation present; phase completion not confirmed).
**Current checkpoint:** Phase 2 remains complete (10/10, user-confirmed). Phase 3 authentication, session rotation, logout, and role-guard source now exist. Review outstanding checks below before advancing.

> IMPORTANT: This file is a progress handoff and working instructions for Codex. It is not proof that a command ran or a feature exists. Verify the repository before modifying anything. The approved Architecture v2.1 takes precedence over older v2.0 material. Do not infer that the local `Architecture Plan.txt` is v2.1 from its name; inspect the version header.

## 1. Instructions for Codex

1. Follow the **KISS principle**: simple, readable, maintainable code; implement one development step at a time.
2. **Require explicit user approval before each next step/phase.** Phase 3 source is already present. This handoff update does not authorize additional implementation, migrations, or advancement to another step/phase.
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
- **Authentication (Phase 3, in progress):** JWT + Passport, Argon2id, RBAC guards, and rotating hashed refresh-token source are present; full integration verification remains outstanding.
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
│   │   ├── schema.prisma            # 24 models
│   │   └── migrations/
│   │       ├── 20261027150551_init/migration.sql
│   │       ├── 20261029133315_add_refresh_token_family/migration.sql
│   │       └── migration_lock.toml
│   ├── src/
│   │   ├── auth/
│   │   │   ├── dto/login.dto.ts
│   │   │   ├── auth.config.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.controller.spec.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.logout.spec.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── password.service.ts
│   │   │   └── password.service.spec.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       ├── jwt-auth.guard.spec.ts
│   │   │       ├── roles.guard.ts
│   │   │       └── roles.guard.spec.ts
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

See `docs/DIRECTORY_STRUCTURE.md` for the broader source map; its Phase 2 snapshot does not yet include the Phase 3 additions listed here. Keep this root
handoff and `docs/AGENTS.md` synchronized when changing instructions or status.
Local `.env`, SQLite databases, generated clients, and build output are not
source deliverables. Preserve existing local files and unrelated working changes.

GitHub repository: `https://github.com/theyhatedxve/new-nexora-condotel-system`.

From `D:\Web-JSX\NEXORA\backend`:

```powershell
npx prisma validate
npm run build
npm run test
npm run test:e2e
```

These are verification commands, not a claim they ran during this documentation
update. `npm run test` includes `test/database/database.integrity.spec.ts` and
requires an existing migrated `backend/step10.test.db`. Do not redirect these
tests to the development database. The test source covers connectivity, unique
and foreign-key constraints, required fields, related reads, rollback, and
persistence. The end-to-end suite uses its separate Vitest configuration.

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
| 3 | Authentication & RBAC | **IN PROGRESS** — backend source and tests present; completion not confirmed |
| 4 | Room Management | Not started |
| 5 | Guest Website business features | Not started; foundation exists |
| 6 | Reservation System | Not started |
| 7 | Payment System | Not started |
| 8 | Admin Dashboard business features | Not started; foundation exists |
| 9 | NFC Management | Not started |
| 10 | Reports & Settings | Not started |
| 11 | Security & Testing final phase | Not started (foundational tests already exist) |
| 12 | Production Deployment | Not started |

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

### Phase 3 — Implementation checklist (source inspection, 2026-10-30)

Checked items mean implementation source is present and inspected. They do not
mean the corresponding tests passed or the whole phase is complete. This is a
capability inventory, not a newly approved step sequence.

- [x] Argon2id password hashing and verification service with test source.
- [x] Login DTO validation and credential-based login service.
- [x] JWT access-token issuance and Passport strategy checking active users.
- [x] Refresh credentials hashed before storage, rotated transactionally, with token-family revocation on reuse.
- [x] Logout revokes the current refresh-token family and clears its cookie.
- [x] Auth controller exposes login, refresh, and logout; includes origin checks, HTTP-only refresh cookies, and throttling decorators.
- [x] Global JWT authentication guard with an explicit public-route decorator.
- [x] Role decorator and guard with explicit role matching and no implicit administrator bypass.
- [x] Public health endpoint and protected `auth-check` endpoint.
- [x] Cookie parsing, validation pipe, CORS configuration, and global throttling are wired into the application source.
- [x] `RefreshToken.familyId` and its index added to the schema; migration source exists at `backend/prisma/migrations/20261029133315_add_refresh_token_family/migration.sql`. Model count remains 24.
- [x] Test source exists for passwords, authentication/rotation, logout, auth-controller logout, JWT guards, and role guards.
- [ ] Independently verify the latest backend type check, lint, and relevant unit tests; these were not run during this documentation update.
- [ ] Confirm the refresh-token-family migration is applied to the intended database and the generated client matches the schema.
- [ ] Verify HTTP login, refresh cookies, logout, protected-route 401 responses, and role-based 403 responses through integration tests.
- [ ] Update and verify the existing end-to-end test, which still expects `/` to return `Hello World!`.
- [ ] Implement and verify remaining Phase 3 scope, including optional guest registration and frontend authentication integration, after explicit approval.
- [ ] Obtain explicit confirmation before marking Phase 3 complete or advancing phases.

### Latest code changes and verification notes

- `backend/package.json` and its lockfile now include JWT, Passport, Argon2, throttling, validation/transformation, and cookie-parser packages and related types.
- `AppModule` imports `AuthModule` and registers throttling, JWT, and role guards globally. Protected routes require authentication unless marked public.
- Auth endpoints are `POST /api/auth/login`, `POST /api/auth/refresh`, and `POST /api/auth/logout`. The controller applies origin checks even to public auth routes. Public means bypassing authentication, not bypassing validation or origin checks.
- `GET /api/health` is explicitly public; `GET /api/auth-check` is protected. A 401 on a protected route can be expected for a missing or invalid access token; it does not alone prove a code defect.
- `main.ts` currently calls `enableCors()` twice: once with configured origins and credentials, then with hardcoded local origins. Review actual preflight and credentialed-request behavior before claiming browser authentication works.
- `bootstrap()` is still invoked without a rejection handler. The 2026-10-29 inspection reported a backend `no-floating-promises` lint error at this call.
- The 2026-10-29 inspection passed backend TypeScript validation, admin lint, and seven in-memory password/health-service checks. Guest lint reported a `new Date()` render-purity warning. Those checks predate the latest auth changes and are not evidence that the current auth suites pass.
- Auth/logout tests use mocked dependencies; their presence does not verify real database migrations, browser cookies, or end-to-end HTTP behavior. No runtime tests, migrations, seeds, or production checks ran for this 2026-10-30 documentation update.
- Frontend source still contains starter pages and admin placeholders; do not infer that login screens, refresh interceptors, or guest registration exist from backend auth code.
- Current application and migration changes include uncommitted working-tree files. Preserve them; this documentation task does not authorize committing, overwriting, or reverting them.

## 5. Database model inventory (Architecture v2.1)

The architecture specifies **23 main database models** plus the supporting `RoomTypeAmenity` join model, for **24 models**.

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

**Current model count:** All 24 models are defined in the schema and represented in the initial migration source. Phase 2 is user-confirmed complete. This does not mark later business services, API endpoints, or production database compatibility complete.

## 6. Remaining work (do not mark complete)

- Complete Phase 3 verification and remaining authentication scope, including optional guest registration and frontend integration. Login, JWT, role guards, refresh rotation, and logout now have implementation source as listed above.
- Operational room management and live availability calculation.
- Guest no-account reservation workflow, check-in/out, inventory holds, physical room assignments.
- PayMongo checkout, payment webhook verification, Pay at Property, refunds.
- NFC hardware integration, access control, access logs.
- Actual data-powered dashboard metrics, reporting and production deployment.

## 7. The next requested action

Use this handoff to review the existing Phase 3 implementation and outstanding
checks. Phase 2 remains complete. Do not restart Phase 3 as if no code exists,
and do not mark it complete based on file presence. Obtain approval for the next
implementation or corrective scope before changing application code. Preserve
all existing models, migrations, seeds, tests, and the approved v2.1 architecture.
Keep the root `AGENTS.md` and `docs/AGENTS.md` synchronized. Never copy actual
secrets, credentials, tokens, or guest records into documentation or tool output.
