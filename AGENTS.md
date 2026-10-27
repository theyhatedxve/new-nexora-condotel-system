# NEXORA — Codex Project Instructions and Development Status

**Last status update:** 2026-10-26  
**Authoritative specification:** NEXORA Final Condotel Management System Architecture **v2.1** (approved).  
**Current phase:** Phase 2 — Database Foundation.  
**Current checkpoint:** Step 4 reported complete; **Step 5 is NOT authorized**.

> IMPORTANT: This file is a progress handoff and working instructions for Codex. It is not proof that a command ran or a feature exists. Verify the repository before modifying anything. The approved Architecture v2.1 takes precedence over older v2.0 material. Do not infer that the local `Architecture Plan.txt` is v2.1 from its name; inspect the version header.

## 1. Instructions for Codex

1. Follow the **KISS principle**: simple, readable, maintainable code; implement one development step at a time.
2. **Require explicit user approval before each next step/phase.** Do not start Phase 2 Step 5, generate its code, or run its migrations until the user explicitly approves.
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
│   ├── guest-web/      # Vite React JS/JSX, development port 5173
│   └── admin-web/      # Vite React JS/JSX, development port 5174
├── backend/            # NestJS TS, port 3000, Prisma, Vitest
│   ├── prisma/
│   │   └── schema.prisma
│   ├── prisma7.config.ts
│   ├── .env             # local only, ignored by Git
│   └── .env.example
├── docs/
├── .gitignore
└── README.md
```

GitHub repository: `https://github.com/theyhatedxve/new-nexora-condotel-system`.

From `D:\Web-JSX\NEXORA\backend`:

```powershell
npx prisma format
npx prisma validate
npm run build
npm run test
npm audit
```

Backend health endpoint: `http://localhost:3000/api/health`. Frontend connectivity was verified in Phase 1.

**Prisma schema caution:** Put complete `@relation(fields: [...], references: [...], onDelete: Restrict)` attributes on one line. Splitting the attribute onto multiple lines caused Prisma P1012 errors in Step 3; the user fixed these and reported successful validation.

## 4. Status checklist — phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Project Foundation | **COMPLETED** (8/8 user-verified) |
| 2 | Database Foundation | **IN PROGRESS** (4/10 steps completed or user-confirmed) |
| 3 | Authentication & RBAC | Not started |
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

### Phase 2 — Step-level progress (4/10)

- [x] **Step 1 — Install and Configure Prisma:** Prisma 7.10.1, SQLite adapter and config installed; CLI/schema validation, build, Vitest and health check passed. Native SQLite in-memory driver test passed. Optional `@nestjs/mau` removed. `multer` overridden to 2.5.0; most recently reported `npm audit` found 0 vulnerabilities.
- [x] **Step 2 — Establish Database Conventions:** Approved CUID IDs; PascalCase models/camelCase fields; integer centavos; UTC event timestamps / Asia/Manila display; separate booking/payment statuses; history preservation; one Property; backend transactions and inventory checks for conflicts.
- [x] **Step 3 — Property and Room Models:** `Property`, `RoomType`, `Room`, `Amenity`, `RoomImage`, `RoomTypeAmenity` and `RoomStatus` enum added. User reported `prisma format`, `prisma validate`, backend build and Vitest all passed after P1012 correction.
- [x] **Step 4 — User and Guest Models:** Design approved for `User`, `Role`, `RefreshToken`, `Guest` and `UserStatus` enum; implementation instructions delivered. **User states Step 4 completed**, but did not supply individual final command outputs. Marked *user-confirmed*, not independently reverified.
- [ ] **Step 5 — Reservation Models:** Not started; **requires explicit approval**, starting with model design review.
- [ ] **Step 6 — Payment Models:** Not started.
- [ ] **Step 7 — NFC and Administration Models:** Not started.
- [ ] **Step 8 — Database Migrations and Prisma Client Integration:** Not started.
- [ ] **Step 9 — Initial Test Data:** Not started.
- [ ] **Step 10 — Database Testing and Review:** Not started.

## 5. Database model inventory (Architecture v2.1)

The architecture specifies **23 main database models** plus the supporting `RoomTypeAmenity` join model, for **24 planned models**.

**Defined/validated in Step 3:**
- [x] `Property`
- [x] `RoomType`
- [x] `Room`
- [x] `Amenity`
- [x] `RoomImage`
- [x] `RoomTypeAmenity` (supporting join model)

**User-reported complete in Step 4; independently revalidate as needed:**
- [x] `User`
- [x] `Role`
- [x] `RefreshToken`
- [x] `Guest`

**Remaining, not implemented:**
- [ ] `Reservation`
- [ ] `ReservationGuest`
- [ ] `RoomAssignment`
- [ ] `RoomBlock`
- [ ] `Payment`
- [ ] `PaymentEvent`
- [ ] `Refund`
- [ ] `NfcCard`
- [ ] `NfcCredential`
- [ ] `CardAssignment`
- [ ] `DoorDevice`
- [ ] `AccessLog`
- [ ] `AuditLog`
- [ ] `SystemSetting`

**Current model count:** 10 defined or user-reported completed; 14 not yet implemented. This is **schema progress**, not proof of tables or runtime features.

## 6. Not yet built (do not mark complete)

- SQLite schema migrations and generated Prisma Client integration with NestJS.
- Runtime database queries, relations, seeds, and integration tests.
- JWT authentication, account registration/login, RBAC guards, session rotation.
- Operational room management and live availability calculation.
- Guest no-account reservation workflow, check-in/out, inventory holds, physical room assignments.
- PayMongo checkout, payment webhook verification, Pay at Property, refunds.
- NFC hardware integration, access control, access logs.
- Actual data-powered dashboard metrics, reporting and production deployment.

## 7. The next requested action

**STOP.** The user has **not approved Phase 2 Step 5**. If asked for progress, use this checklist and distinguish verified vs user-confirmed work. If the user later explicitly approves Step 5, first present the `Reservation`, `ReservationGuest`, `RoomAssignment`, and `RoomBlock` model design and seek approval **before writing Prisma code**. Preserve all existing models and the approved v2.1 architecture.
