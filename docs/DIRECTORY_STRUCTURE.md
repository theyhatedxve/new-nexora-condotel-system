# NEXORA — System Directory Structure

## 1. Purpose and Scope

This guide maps the system's directories to their responsibilities and related
documentation. Paths are relative to the `NEXORA/` repository root at
`D:\Web-JSX\NEXORA`.

The current structure below was inspected on 2026-10-31. Runtime artifacts are
identified without exposing their contents. File presence does not establish
that a feature has been tested or deployed. The [approved architecture v2.1](NEXORA_ARCHITECTURE_V2.1.md)
defines system scope; the [development reference](AGENTS.md) records current scope and approval gates.
The [system overview](README.md) describes the product without development logs.

Phases 1–4 are COMPLETED per owner instruction. Phase 3 has eight completed
steps and Phase 4 has seven. Phase 5 Steps 1–3 are complete; Steps 4–5 backend
work is complete and frontend integration is in progress. Steps 6–7 remain
pending; Phase 6 onward awaits explicit approval. Earlier
Phase 3 acceptance was based on the owner-reported 23/23 checks, full regression,
build, Prisma validation, and preserved development data. Phase 4 source/test fixtures were
inspected; no new pass count is claimed. This task did not rerun application checks. Phase 2's initial 24 models remain; Phase 3 adds EmailVerificationToken
for **25 current models**. See [AGENTS.md](AGENTS.md) for the completion checklist
and [security](SECURITY.md#14-security-acceptance-checks) for evidence boundaries.

## 2. Current Directory Structure

This tree shows application source, configuration, tests, and documentation.
Dependency contents, build output, generated-client contents, local databases,
secrets, Git internals, and temporary schema backups are omitted.

```text
NEXORA/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 20261027150551_init/
│   │   │   │   └── migration.sql
│   │   │   ├── 20261029133315_add_refresh_token_family/
│   │   │   │   └── migration.sql
│   │   │   ├── 20261030134255_add_email_verification_tokens/
│   │   │   │   └── migration.sql
│   │   │   ├── 20261031_phase4_step6_room_block_cancellation/
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   └── schema.prisma
│   ├── src/
│   │   ├── amenities/
│   │   │   ├── dto/
│   │   │   │   ├── attach-amenity.dto.ts
│   │   │   │   ├── create-amenity.dto.ts
│   │   │   │   └── update-amenity.dto.ts
│   │   │   ├── amenities.authorization.spec.ts
│   │   │   ├── amenities.controller.ts
│   │   │   ├── amenities.module.ts
│   │   │   ├── amenities.service.ts
│   │   │   ├── amenities.spec.ts
│   │   │   └── room-type-amenities.controller.ts
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
│   │   │   └── registration.spec.ts
│   │   ├── availability/
│   │   │   ├── dto/
│   │   │   │   └── search-availability.dto.ts
│   │   │   ├── availability-calculator.ts
│   │   │   ├── availability.controller.ts
│   │   │   ├── availability.module.ts
│   │   │   └── availability.service.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.spec.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.spec.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── inventory/
│   │   │   │   ├── inventory-safety.module.ts
│   │   │   │   ├── inventory-safety.service.ts
│   │   │   │   └── inventory-safety.spec.ts
│   │   │   ├── ownership/
│   │   │   │   ├── ownership.module.ts
│   │   │   │   ├── ownership.service.spec.ts
│   │   │   │   └── ownership.service.ts
│   │   │   └── validation/
│   │   │       ├── philippine-date-range.ts
│   │   │       ├── room-rate-capacity.service.ts
│   │   │       └── room-rate-capacity.spec.ts
│   │   ├── generated/
│   │   │   └── prisma/                  # Generated contents omitted
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── seed.ts
│   │   ├── room-blocks/
│   │   │   ├── dto/
│   │   │   │   ├── create-room-block.dto.ts
│   │   │   │   └── update-room-block.dto.ts
│   │   │   ├── room-blocks.authorization.spec.ts
│   │   │   ├── room-blocks.controller.ts
│   │   │   ├── room-blocks.module.ts
│   │   │   ├── room-blocks.service.ts
│   │   │   └── room-blocks.spec.ts
│   │   ├── room-images/
│   │   │   ├── dto/
│   │   │   │   └── update-room-image.dto.ts
│   │   │   ├── image-storage.service.ts
│   │   │   ├── image-validation.service.ts
│   │   │   ├── room-images.authorization.spec.ts
│   │   │   ├── room-images.controller.ts
│   │   │   ├── room-images.module.ts
│   │   │   ├── room-images.service.ts
│   │   │   └── room-images.spec.ts
│   │   ├── room-types/
│   │   │   ├── dto/
│   │   │   │   ├── create-room-type.dto.ts
│   │   │   │   └── update-room-type.dto.ts
│   │   │   ├── room-rate-capacity.integration.spec.ts
│   │   │   ├── room-types.controller.ts
│   │   │   ├── room-types.module.ts
│   │   │   ├── room-types.service.ts
│   │   │   └── room-types.spec.ts
│   │   ├── rooms/
│   │   │   ├── dto/
│   │   │   │   ├── create-room.dto.ts
│   │   │   │   ├── update-room-status.dto.ts
│   │   │   │   └── update-room.dto.ts
│   │   │   ├── room-status.controller.ts
│   │   │   ├── room-status.service.ts
│   │   │   ├── rooms.authorization.spec.ts
│   │   │   ├── rooms.controller.ts
│   │   │   ├── rooms.module.ts
│   │   │   ├── rooms.service.ts
│   │   │   └── rooms.spec.ts
│   │   ├── app.controller.spec.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── test/
│   │   ├── database/
│   │   │   └── database.integrity.spec.ts
│   │   └── app.e2e-spec.ts
│   ├── .env.example
│   ├── .gitattributes
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── .prettierrc
│   ├── nest-cli.json
│   ├── package-lock.json
│   ├── package.json
│   ├── prisma7.config.ts
│   ├── README.md
│   ├── skills-lock.json
│   ├── tsconfig.build.json
│   ├── tsconfig.json
│   ├── vitest.config.e2e.ts
│   └── vitest.config.ts
├── backups/                         # Local contents omitted
├── docs/
│   ├── AGENTS.md
│   ├── API.md
│   ├── BUSINESS_FLOWS.md
│   ├── CI_CD_ROADMAP.MD
│   ├── CODING_PATTERNS.md
│   ├── CODING_PRINCIPLES.md
│   ├── CONVENTIONAL_COMMITS.md
│   ├── DATABASE_SCHEMA.md
│   ├── design_guidelines.md
│   ├── DEVELOPMENT_RULES.md
│   ├── DIRECTORY_STRUCTURE.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── NEXORA_ARCHITECTURE_V2.1.md
│   ├── README.md
│   ├── SECURITY.md
│   ├── SYSTEM_DESIGN.md
│   └── TECHNICAL_PLAN.md
├── frontend/
│   ├── admin-web/
│   │   ├── public/
│   │   │   ├── favicon.svg
│   │   │   └── icons.svg
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   ├── hero.png
│   │   │   │   ├── react.svg
│   │   │   │   └── vite.svg
│   │   │   ├── components/
│   │   │   │   ├── BackendStatus.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── layouts/
│   │   │   │   └── AdminLayout.jsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── PlaceholderPage.jsx
│   │   │   ├── services/
│   │   │   │   └── api.js
│   │   │   ├── styles/
│   │   │   │   └── global.css
│   │   │   ├── App.css
│   │   │   ├── App.jsx
│   │   │   ├── index.css
│   │   │   └── main.jsx
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── .oxlintrc.json
│   │   ├── index.html
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── README.md
│   │   └── vite.config.js
│   └── guest-web/
│       ├── public/
│       │   ├── favicon.svg
│       │   └── icons.svg
│       ├── src/
│       │   ├── assets/
│       │   │   ├── hero.png
│       │   │   ├── react.svg
│       │   │   └── vite.svg
│       │   ├── components/
│       │   │   ├── BackendStatus.jsx
│       │   │   ├── Footer.jsx
│       │   │   ├── Navbar.jsx
│       │   │   └── RoomCard.jsx
│       │   ├── hooks/
│       │   │   ├── useRoomDetails.js
│       │   │   └── useRoomTypes.js
│       │   ├── layouts/
│       │   │   └── GuestLayout.jsx
│       │   ├── pages/
│       │   │   ├── Home.jsx
│       │   │   ├── RoomDetails.jsx
│       │   │   └── Rooms.jsx
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   └── roomTypesApi.js
│       │   ├── styles/
│       │   │   ├── global.css
│       │   │   └── tokens.css
│       │   ├── utils/
│       │   │   └── formatMoney.js
│       │   ├── App.css
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env.example
│       ├── .gitignore
│       ├── .oxlintrc.json
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── README.md
│       └── vite.config.js
├── storage/                         # Local contents omitted
├── .gitignore
├── AGENTS.md
├── NEXORA_ARCHITECTURE_V2.1.md
└── README.md
```

## 3. Directory Responsibilities

| Location | Responsibility | Related documentation |
|---|---|---|
| `frontend/guest-web/` | Public guest interface; future booking and guest flows | [System design](SYSTEM_DESIGN.md), [business flows](BUSINESS_FLOWS.md), [design guidelines](design_guidelines.md) |
| `frontend/admin-web/` | Staff interface, shared admin layout, and operational screens as implemented | [System design](SYSTEM_DESIGN.md), [design guidelines](design_guidelines.md), [security](SECURITY.md) |
| Frontend `src/components/` | Reusable interface pieces | [Coding patterns](CODING_PATTERNS.md), [design guidelines](design_guidelines.md) |
| Frontend `src/pages/` and existing `src/layouts/` | Route-level screens and shared page shells | [Technical plan](TECHNICAL_PLAN.md), [business flows](BUSINESS_FLOWS.md) |
| Frontend `src/services/` | HTTP client configuration and API access | [API contracts](API.md), [coding patterns](CODING_PATTERNS.md) |
| Frontend `src/styles/`, `src/assets/`, and `public/` | Shared CSS, imported assets, and static public files | [Design guidelines](design_guidelines.md) |
| `backend/src/` | API bootstrap, modules, controllers, and services | [System design](SYSTEM_DESIGN.md), [API contracts](API.md), [technical plan](TECHNICAL_PLAN.md) |
| `backend/src/availability/` | Public read-only date/capacity search and backend stay-price quote; frontend integration remains in progress | [API](API.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `frontend/guest-web/src/layouts/`, `hooks/`, `services/`, and `utils/` | Shared guest layout, connected room metadata, image URL handling, and nightly-rate formatting | [System design](SYSTEM_DESIGN.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `backend/src/auth/` | Auth, registration, SMTP delivery, verification, DTOs, and security tests | [Implemented API](API.md), [security](SECURITY.md) |
| `backend/src/common/` | Public/role decorators, global guards, and reusable OwnershipModule/OwnershipService | [Security](SECURITY.md), [coding patterns](CODING_PATTERNS.md) |
| `backend/src/room-types/`, `rooms/`, `amenities/`, `room-images/`, `room-blocks/` | Implemented room-management modules, DTOs, controllers, services, and isolated tests | [API](API.md), [security](SECURITY.md) |
| `backend/src/common/validation/` and `common/inventory/` | Shared numeric/date validation and transaction-scoped room eligibility; no public booking endpoint | [Database safety](DATABASE_SCHEMA.md), [development reference](AGENTS.md) |
| `backend/src/prisma/` | NestJS database provider, connection lifecycle, and guarded development seed | [Database schema](DATABASE_SCHEMA.md), [coding patterns](CODING_PATTERNS.md) |
| `backend/prisma/` | All 25 model definitions and four migrations | [Database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `backend/src/generated/prisma/` | Prisma-generated client used by backend code; regenerate through Prisma tooling | [Database schema](DATABASE_SCHEMA.md), [technical plan](TECHNICAL_PLAN.md) |
| `backend/src/*.spec.ts` and `backend/test/` | Colocated unit tests and separate end-to-end tests using Vitest configuration | [Implementation guide](IMPLEMENTATION_GUIDE.md), [technical plan](TECHNICAL_PLAN.md) |
| `backend/test/database/` | Database integrity tests using an existing migrated `backend/step10.test.db`; covers connectivity, constraints, relations, rollback, and persistence | [Database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `.env.example` files | Environment configuration templates without real credentials | [Security](SECURITY.md), [development rules](DEVELOPMENT_RULES.md) |
| Application `package.json` files | Per-application dependencies and executable scripts | [Implementation guide](IMPLEMENTATION_GUIDE.md), [CI/CD roadmap](CI_CD_ROADMAP.MD) |
| `docs/` | Architecture explanations, standards, contracts, and delivery guidance | [Development reference](AGENTS.md) |

Both frontend applications communicate with the shared backend API. Database
access belongs in the backend. Backend authentication and room management are implemented; placeholder screens and
database models do not establish frontend authentication integration, booking,
payment, or physical NFC functionality. Ownership helpers must be called by
future business services explicitly.

Isolated suite database paths are documented in the
[implementation guide](IMPLEMENTATION_GUIDE.md#15-command-guidance). The guest frontend has no availability request service or date/guest search and
searched-stay quote UI yet. The unused backend/src/auth/verify-email.dto.ts was
removed before this audit; the controller imports
backend/src/auth/dto/verify-email.dto.ts. This task performed no source cleanup.

## 4. Planned Structure and Placement Rules

The [technical plan's project structure](TECHNICAL_PLAN.md#2-project-structure)
includes future directories. They are created when an approved implementation
needs them:

- Guest `layouts/`, `hooks/`, and `utils/` now exist. Add `routes/` or other
  frontend directories only when required; existing route declarations are in App.jsx.
- Backend future feature directories: `users/`, `guests/`,
  `reservations/`, `payments/`, `nfc/`, `dashboard/`, `reports/`, `uploads/`,
  `settings/`, and `audit/`.
- Backend `auth/`, `room-types/`, `rooms/`, `amenities/`, `room-images/`,
  `room-blocks/`, and `common/` already exist; add further shared concerns only when needed.

Keep frontend source in JavaScript/JSX and backend source in TypeScript. Place
business logic in backend services, follow the existing naming conventions, and
create directories only when needed. See [development rules](DEVELOPMENT_RULES.md),
[coding principles](CODING_PRINCIPLES.md), and [coding patterns](CODING_PATTERNS.md).

This guide records structure; it does not authorize a new development phase.
Follow the approval and verification process in the
[implementation guide](IMPLEMENTATION_GUIDE.md).

## 5. Relationship to the Documentation Set

| Document | How it relates to this guide |
|---|---|
| [README.md](README.md) | Product-focused system overview and intended user experiences |
| [AGENTS.md](AGENTS.md) | Phase completion checklist and agent handoff; kept synchronized with the root copy |
| [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md) | Authoritative approved architecture baseline; root file is a reference copy |
| [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) | Explains system boundaries and the responsibilities behind the directories |
| [TECHNICAL_PLAN.md](TECHNICAL_PLAN.md) | Defines the intended expanded layout, naming, request lifecycle, and roadmap |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Explains the models and constraints represented in `backend/prisma/` |
| [API.md](API.md) | Defines contracts between frontend services and backend endpoints, with contract status |
| [BUSINESS_FLOWS.md](BUSINESS_FLOWS.md) | Explains workflows that future pages and backend feature modules must support |
| [SECURITY.md](SECURITY.md) | Defines security requirements across applications, configuration, and integrations |
| [design_guidelines.md](design_guidelines.md) | Guides frontend components, layouts, styles, and interface states |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | Defines implementation sequence and checks for changes in these locations |
| [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) | Sets stack, folder organization, security, and development rules |
| [CODING_PRINCIPLES.md](CODING_PRINCIPLES.md) | Guides maintainable code and responsibility boundaries within the layout |
| [CODING_PATTERNS.md](CODING_PATTERNS.md) | Provides patterns for components, API services, backend services, and transactions |
| [CONVENTIONAL_COMMITS.md](CONVENTIONAL_COMMITS.md) | Defines how to describe repository changes in commits |
| [CI_CD_ROADMAP.MD](CI_CD_ROADMAP.MD) | Plans checks, artifacts, migrations, and deployment across the three applications |

## 6. Maintaining This Guide

Update this file when source directories or significant entry points change.
Keep the current tree aligned with the working source and identify planned
directories separately. Update the [technical plan](TECHNICAL_PLAN.md) when the
intended layout changes, and keep the [development reference](AGENTS.md) aligned with
this guide.

Exclude dependency contents, build output, secrets, and local database contents
from directory documentation. Use the [root README](../README.md) for the public system overview
and the [implementation guide](IMPLEMENTATION_GUIDE.md) for verification steps.
