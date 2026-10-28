# NEXORA — Codex Project Instructions and Development Status

**Last status update:** 2026-10-28
**Authoritative specification:** NEXORA Final Condotel Management System Architecture **v2.1** (approved).
**Current phase:** Phase 2 — Database Foundation **COMPLETED** (10/10, user-confirmed).
**Current checkpoint:** Phase 2 completion confirmed by the user on 2026-10-28. Phase 3 — Authentication & RBAC is next and requires explicit approval.

> IMPORTANT: This file is a progress handoff and working instructions for Codex. It is not proof that a command ran or a feature exists. Verify the repository before modifying anything. The approved Architecture v2.1 takes precedence over older v2.0 material. Do not infer that the local `Architecture Plan.txt` is v2.1 from its name; inspect the version header.

## 1. Instructions for Codex

1. Follow the **KISS principle**: simple, readable, maintainable code; implement one development step at a time.
2. **Require explicit user approval before each next step/phase.** Phase 2 is complete. Do not start Phase 3 implementation until the user explicitly approves that scope.
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
- **Authentication (later phase):** JWT + Passport, Argon2id, RBAC, rotating hashed refresh tokens.
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
│   │       └── migration_lock.toml
│   ├── src/
│   │   ├── generated/prisma/        # Generated client, ignored by Git
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── seed.ts              # Guarded development sample data
│   │   ├── app.module.ts            # Imports PrismaModule
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

See `docs/DIRECTORY_STRUCTURE.md` for the complete source map. Keep this root
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
| 3 | Authentication & RBAC | Next phase; awaiting explicit approval |
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

## 6. Not yet built (do not mark complete)

- JWT authentication, account registration/login, RBAC guards, session rotation.
- Operational room management and live availability calculation.
- Guest no-account reservation workflow, check-in/out, inventory holds, physical room assignments.
- PayMongo checkout, payment webhook verification, Pay at Property, refunds.
- NFC hardware integration, access control, access logs.
- Actual data-powered dashboard metrics, reporting and production deployment.

## 7. The next requested action

Phase 2 is complete. Phase 3 — Authentication & RBAC is the next development
phase and has not been authorized by this documentation request. When explicitly
approved, review the existing schema and architecture, present the proposed
Phase 3 design and scope, and follow the step-by-step approval workflow before
implementation. Preserve all existing models, migrations, seed data, tests, and
the approved v2.1 architecture.
