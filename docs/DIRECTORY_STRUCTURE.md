# NEXORA — System Directory Structure

## 1. Purpose and Scope

This guide maps the system's directories to their responsibilities and related
documentation. Paths are relative to the `NEXORA/` repository root at
`D:\Web-JSX\NEXORA`.

The current structure below was inspected on 2026-10-30, including local files
that are not yet committed. File presence does not establish that a feature has
been tested or deployed. The [approved architecture v2.1](../NEXORA_ARCHITECTURE_V2.1.md)
defines system scope; the [documentation index](README.md) explains document
authority and status labels.

Phases 1 and 2 are COMPLETED. Phase 3 is **COMPLETED — 8/8 steps**,
accepted by the owner from reported 23/23 checks, full regression, build, Prisma
validation, and preserved development data. Phase 4 onward is **NOT STARTED /
AWAITING APPROVAL**. This task inspected source; it did not rerun application
checks. Phase 2's initial 24 models remain; Phase 3 adds EmailVerificationToken
for **25 current models**. See [AGENTS.md](AGENTS.md) for the completion checklist
and [security](SECURITY.md#14-security-acceptance-checks) for evidence boundaries.

## 2. Current Directory Structure

This tree shows application source, configuration, tests, and documentation.
Dependency contents, build output, generated-client contents, local databases,
secrets, Git internals, and temporary schema backups are omitted.

```text
NEXORA/
├── frontend/
│   ├── guest-web/                       # Public React JavaScript/JSX application
│   │   ├── public/                      # Static public assets
│   │   ├── src/
│   │   │   ├── assets/                  # Assets imported by application code
│   │   │   ├── components/
│   │   │   │   ├── BackendStatus.jsx
│   │   │   │   └── Navbar.jsx
│   │   │   ├── pages/
│   │   │   │   ├── Home.jsx
│   │   │   │   └── Rooms.jsx
│   │   │   ├── services/
│   │   │   │   └── api.js               # Axios API client
│   │   │   ├── styles/
│   │   │   │   └── global.css
│   │   │   ├── App.jsx
│   │   │   ├── App.css
│   │   │   ├── index.css
│   │   │   └── main.jsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── vite.config.js
│   │   └── README.md
│   └── admin-web/                       # Staff React JavaScript/JSX application
│       ├── public/
│       ├── src/
│       │   ├── assets/
│       │   ├── components/
│       │   │   ├── BackendStatus.jsx
│       │   │   └── Sidebar.jsx
│       │   ├── layouts/
│       │   │   └── AdminLayout.jsx
│       │   ├── pages/
│       │   │   ├── Dashboard.jsx
│       │   │   └── PlaceholderPage.jsx
│       │   ├── services/
│       │   │   └── api.js
│       │   ├── styles/
│       │   │   └── global.css
│       │   ├── App.jsx
│       │   ├── App.css
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.js
│       └── README.md
├── backend/                             # Shared NestJS TypeScript REST API
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 20261027150551_init/
│   │   │   │   └── migration.sql
│   │   │   ├── 20261029133315_add_refresh_token_family/
│   │   │   │   └── migration.sql
│   │   │   ├── 20261030134255_add_email_verification_tokens/
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   └── schema.prisma               # All 25 current models defined
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
│   │   ├── generated/
│   │   │   └── prisma/                  # Generated Prisma client
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── seed.ts                 # Guarded development sample data
│   │   ├── app.controller.ts
│   │   ├── app.controller.spec.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── test/
│   │   ├── database/
│   │   │   └── database.integrity.spec.ts
│   │   └── app.e2e-spec.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── .gitattributes
│   ├── .oxlintrc.json
│   ├── .prettierrc
│   ├── nest-cli.json
│   ├── package.json
│   ├── package-lock.json
│   ├── prisma7.config.ts
│   ├── skills-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   ├── vitest.config.e2e.ts
│   └── README.md
├── docs/
│   ├── README.md                       # Documentation index
│   ├── DIRECTORY_STRUCTURE.md          # This directory guide
│   ├── AGENTS.md                       # Synchronized agent handoff and checklist
│   ├── NEXORA_ARCHITECTURE_V2.1.md      # Documentation copy of architecture
│   ├── SYSTEM_DESIGN.md
│   ├── TECHNICAL_PLAN.md
│   ├── DATABASE_SCHEMA.md
│   ├── API.md
│   ├── BUSINESS_FLOWS.md
│   ├── SECURITY.md
│   ├── design_guidelines.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── DEVELOPMENT_RULES.md
│   ├── CODING_PRINCIPLES.md
│   ├── CODING_PATTERNS.md
│   ├── CONVENTIONAL_COMMITS.md
│   └── CI_CD_ROADMAP.MD
├── .gitignore
├── AGENTS.md                            # Agent instructions and progress handoff
├── NEXORA_ARCHITECTURE_V2.1.md           # Approved architecture
└── README.md                            # Project setup and local commands
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
| `backend/src/auth/` | Auth, registration, SMTP delivery, verification, DTOs, and security tests | [Implemented API](API.md), [security](SECURITY.md) |
| `backend/src/common/` | Public/role decorators, global guards, and reusable OwnershipModule/OwnershipService | [Security](SECURITY.md), [coding patterns](CODING_PATTERNS.md) |
| `backend/src/prisma/` | NestJS database provider, connection lifecycle, and guarded development seed | [Database schema](DATABASE_SCHEMA.md), [coding patterns](CODING_PATTERNS.md) |
| `backend/prisma/` | All 25 model definitions and three migrations | [Database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `backend/src/generated/prisma/` | Prisma-generated client used by backend code; regenerate through Prisma tooling | [Database schema](DATABASE_SCHEMA.md), [technical plan](TECHNICAL_PLAN.md) |
| `backend/src/*.spec.ts` and `backend/test/` | Colocated unit tests and separate end-to-end tests using Vitest configuration | [Implementation guide](IMPLEMENTATION_GUIDE.md), [technical plan](TECHNICAL_PLAN.md) |
| `backend/test/database/` | Database integrity tests using an existing migrated `backend/step10.test.db`; covers connectivity, constraints, relations, rollback, and persistence | [Database schema](DATABASE_SCHEMA.md), [implementation guide](IMPLEMENTATION_GUIDE.md) |
| `.env.example` files | Environment configuration templates without real credentials | [Security](SECURITY.md), [development rules](DEVELOPMENT_RULES.md) |
| Application `package.json` files | Per-application dependencies and executable scripts | [Implementation guide](IMPLEMENTATION_GUIDE.md), [CI/CD roadmap](CI_CD_ROADMAP.MD) |
| `docs/` | Architecture explanations, standards, contracts, and delivery guidance | [Documentation index](README.md) |

Both frontend applications communicate with the shared backend API. Database
access belongs in the backend. Backend authentication is accepted through Phase 3; placeholder screens and
database models do not establish frontend authentication integration, booking,
payment, or physical NFC functionality. Ownership helpers must be called by
future business services explicitly.

Isolated suite database paths are documented in the
[implementation guide](IMPLEMENTATION_GUIDE.md#15-command-guidance). The extra
backend/src/auth/verify-email.dto.ts is empty; the controller imports
backend/src/auth/dto/verify-email.dto.ts. No source cleanup was performed.

## 4. Planned Structure and Placement Rules

The [technical plan's project structure](TECHNICAL_PLAN.md#2-project-structure)
includes future directories. They are created when an approved implementation
needs them:

- Frontend `layouts/`, `routes/`, and `hooks/` where absent. The admin application
  already has `layouts/`; the guest application does not yet have it.
- Backend future feature directories: `users/`, `guests/`, `rooms/`,
  `reservations/`, `payments/`, `nfc/`, `dashboard/`, `reports/`, `uploads/`,
  `settings/`, and `audit/`.
- Backend `auth/` and `common/` already exist; add further shared concerns only when needed.

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
| [README.md](README.md) | Entry point, document authority, and reading order |
| [AGENTS.md](AGENTS.md) | Phase completion checklist and agent handoff; kept synchronized with the root copy |
| [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md) | Documentation copy of the approved architecture that defines the system scope |
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
intended layout changes, and keep the [documentation index](README.md) linked to
this guide.

Exclude dependency contents, build output, secrets, and local database contents
from directory documentation. Use the [root README](../README.md) for the public system overview
and the [implementation guide](IMPLEMENTATION_GUIDE.md) for verification steps.
