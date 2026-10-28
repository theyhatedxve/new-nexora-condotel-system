# NEXORA — Documentation Index

## 1. Purpose

NEXORA is a single-property condotel management system.

It includes:

- NEXORA Guest Website.
- NEXORA Admin Dashboard.
- One shared NestJS REST API.
- One centralized SQL database.
- PayMongo Hosted Checkout.
- Pay at Property.
- NFC management, with physical integration dependent on hardware selection.

This documentation explains the architecture, business rules, development
standards, and implementation order.

## 2. Architecture Authority

The approved Master Architecture v2.1 defines the system scope.

These documents expand that architecture without replacing it.

Use the following labels:

| Label | Meaning |
|---|---|
| Approved | Explicitly defined by Master Architecture v2.1 or a subsequent approved decision |
| Proposed | Suggested implementation detail awaiting approval |
| TBD | Decision has not been made |
| Implemented | Verified in the application source |
| Tested | Verified through a recorded test |

A documented feature is not automatically implemented or tested.

Do not infer current project progress from an older architecture status.
Verify the current repository and the latest approved development results.

## 3. Technology Stack

| Area | Approved technology |
|---|---|
| Guest frontend | React, JavaScript/JSX, Vite |
| Admin frontend | React, JavaScript/JSX, Vite |
| Navigation | React Router |
| API client | Axios |
| Styling | Plain CSS |
| Icons | Lucide React |
| Backend | NestJS with Express |
| Backend language | TypeScript |
| Database access | Prisma ORM |
| Development database | SQLite |
| Production database | PostgreSQL recommended |
| Authentication | Passport and JWT |
| Password hashing | Argon2id |
| Payments | PayMongo Hosted Checkout and Pay at Property |

Frontend source uses `.jsx`, `.js`, and `.css`.
Backend source uses `.ts`.

Do not introduce frontend TypeScript.

## 4. Documentation Map

| File | Purpose |
|---|---|
| [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) | Current directory tree, folder responsibilities, and links to related documentation |
| SYSTEM_DESIGN.md | System boundaries, roles, modules, and architecture |
| TECHNICAL_PLAN.md | Folder structure, technical responsibilities, and roadmap |
| design_guidelines.md | Visual foundations and interface behavior |
| API.md | API routes, access rules, and proposed contracts |
| DATABASE_SCHEMA.md | Models, relationships, constraints, and data conventions |
| BUSINESS_FLOWS.md | Operational workflows and failure handling |
| SECURITY.md | Authentication, authorization, payment, and NFC security |
| IMPLEMENTATION_GUIDE.md | Step-by-step development and verification |
| CODING_PRINCIPLES.md | SOLID, ACID, CRUD, DRY, KISS, and YAGNI |
| CODING_PATTERNS.md | Practical frontend and backend patterns |
| CONVENTIONAL_COMMITS.md | Commit format and examples |
| [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) | Project standards, folder organization, and development process |
| [CI_CD_ROADMAP.MD](CI_CD_ROADMAP.MD) | Planned continuous integration, release, and deployment workflow |

## 5. Recommended Reading Order

1. SYSTEM_DESIGN.md
2. BUSINESS_FLOWS.md
3. TECHNICAL_PLAN.md, then [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) for the current layout
4. DATABASE_SCHEMA.md
5. API.md
6. SECURITY.md
7. design_guidelines.md
8. CODING_PRINCIPLES.md
9. CODING_PATTERNS.md
10. IMPLEMENTATION_GUIDE.md
11. CONVENTIONAL_COMMITS.md

## 6. Development Workflow

For each phase or step:

1. Review the existing implementation.
2. Explain the proposed change.
3. Obtain approval for the specific scope.
4. Provide readable, copy-paste-ready code when authorized.
5. Explain exact file locations and placement.
6. Run the relevant checks.
7. Record actual results.
8. Obtain approval before advancing to another phase.

Approval of documentation does not authorize application implementation.

## 7. Outstanding Decisions

- NFC cards, encoders, readers, locks, and vendor protocol.
- NFC online/offline behavior.
- Inventory-hold duration.
- Cancellation and refund policy.
- Pay at Property arrival cutoff and no-show timing.
- Final request and response contracts.
- Remaining detailed Prisma fields and constraints.
- Production hosting, domains, and durable image storage.
- Production migration and recovery procedures.

Keep these decisions visible until resolved.
