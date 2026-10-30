# NEXORA — Technical Plan

## 1. Implementation Approach

| Phase | Status |
|---|---|
| Phase 1 | COMPLETED |
| Phase 2 | COMPLETED |
| Phase 3 | COMPLETED — 8/8 steps |
| Phase 4 onward | NOT STARTED / AWAITING APPROVAL |

Accepted scope and eight completed Phase 3 steps are tracked in the
[implementation guide](IMPLEMENTATION_GUIDE.md). The owner reports 23/23
acceptance checks passed; this Markdown-only task did not rerun tests/builds.
No production-readiness or Phase 4 authorization is implied.

Build one approved feature at a time.

Prefer direct, readable implementations with minimal dependencies.

Preserve existing working project structure and package configuration.

## 2. Project Structure

For the inspected current directory tree and links between folders and project
documentation, see [System Directory Structure](DIRECTORY_STRUCTURE.md).
The tree below describes the intended expanded layout, including future folders.

The existing frontend/ parent directory is retained.

This reconciles the blueprint's illustrative root-level frontend folders
with the established project layout.

```text
NEXORA/
├── frontend/
│   ├── guest-web/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── layouts/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   └── package.json
│   └── admin-web/
│       ├── src/
│       │   ├── assets/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── layouts/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── hooks/
│       │   ├── styles/
│       │   ├── App.jsx
│       │   └── main.jsx
│       └── package.json
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── guests/
│   │   ├── rooms/
│   │   ├── reservations/
│   │   ├── payments/
│   │   ├── nfc/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── uploads/
│   │   ├── settings/
│   │   ├── audit/
│   │   └── common/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
├── docs/
├── .gitignore
└── README.md
```

Add folders when needed. This tree is not a requirement to create empty folders.

Current additions include auth registration/verification/security tests,
common/decorators, common/guards, common/ownership, and src/prisma integration.
The current schema has 25 models and three migrations; see
[the inspected directory map](DIRECTORY_STRUCTURE.md) and
[database history](DATABASE_SCHEMA.md).

## 3. File Naming

| File | Convention |
|---|---|
| React component | RoomCard.jsx |
| React page | RoomDetailsPage.jsx |
| React hook | useAvailability.js |
| API service | reservationsApi.js |
| Utility | formatMoney.js |
| Stylesheet | room-card.css |
| NestJS controller | reservations.controller.ts |
| NestJS service | reservations.service.ts |
| NestJS module | reservations.module.ts |
| DTO | create-reservation.dto.ts |
| Guard | roles.guard.ts |

Use consistent naming within the existing project.

## 4. Request Lifecycle

```text
User action
    ↓
React page/component
    ↓
Frontend API service
    ↓
NestJS authentication and authorization
    ↓
DTO validation
    ↓
Business service
    ↓
Prisma transaction/query
    ↓
Response DTO
    ↓
Frontend state and feedback
```

Validation improves usability in the frontend and enforces correctness
in the backend.

## 5. Database Strategy

- SQLite for development.
- PostgreSQL recommended for production.
- Prisma for schema and database access.
- Versioned migrations.
- Integer centavos for approved monetary fields.
- Date-only stay semantics and UTC event timestamps.
- Restrictive deletion for historical relationships.

SQLite success does not prove PostgreSQL compatibility.

Verify migrations, constraints, date behavior, and concurrent inventory
operations against the production database before launch.

## 6. Configuration

Keep environment-specific values outside source code.

Backend configuration categories:

- Server port.
- Database connection.
- Allowed frontend origins.
- JWT signing and validation.
- Refresh-session settings.
- PayMongo credentials.
- Webhook verification secret.
- Upload storage.
- Encryption keys when required.
- Approved business policies.

Frontend configuration contains public values such as the API base URL.

Vite frontend environment values are visible to users.
Never place backend secrets in frontend configuration.

Auth configuration reads JWT_ACCESS_SECRET and AUTH_ALLOWED_ORIGINS. Email
delivery reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, and
AUTH_VERIFY_URL. These are variable names only; actual values remain outside
documentation. See [security](SECURITY.md) for transport and monitoring limits.

## 7. Development Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 01 — Project Foundation | Two React JSX applications, NestJS backend, API connection | COMPLETED |
| 02 — Database Foundation | Models, relationships, migrations, seeds | COMPLETED |
| 03 — Authentication & RBAC | Sessions, roles, optional guest accounts | COMPLETED — 8/8 steps |
| 04 — Room Management | Types, rooms, rates, images, amenities | NOT STARTED / AWAITING APPROVAL |
| 05 — Guest Website | Public pages and availability interface | NOT STARTED / AWAITING APPROVAL |
| 06 — Reservation System | Holds, bookings, assignments, check-in/out | NOT STARTED / AWAITING APPROVAL |
| 07 — Payment System | PayMongo and Pay at Property | NOT STARTED / AWAITING APPROVAL |
| 08 — Admin Dashboard | Operational screens and statistics | NOT STARTED / AWAITING APPROVAL |
| 09 — NFC Management | Cards, assignments, simulations, later device integration | NOT STARTED / AWAITING APPROVAL |
| 10 — Reports & Settings | Reports, policies, audit views | NOT STARTED / AWAITING APPROVAL |
| 11 — Testing & Security | Integrated journeys and failure scenarios | NOT STARTED / AWAITING APPROVAL |
| 12 — Production Deployment | Hosting, PostgreSQL, storage, recovery, monitoring | NOT STARTED / AWAITING APPROVAL |

Security and testing apply throughout development.
Phase 11 provides broader integrated verification.

## 8. Testing Strategy

| Level | What to verify |
|---|---|
| Unit | Pricing, date rules, transitions, permission decisions |
| Database integration | Constraints, rollback, inventory contention |
| API integration | Validation, ownership, RBAC, response contracts |
| Frontend | Forms, loading, errors, booking and staff workflows |
| End-to-end | Complete guest and reception journeys |
| External integration | PayMongo test mode and selected NFC hardware |

Phase 3 acceptance includes isolated auth, ownership, registration, and HTTP
security suites. See [test prerequisites and commands](IMPLEMENTATION_GUIDE.md#15-command-guidance)
and [reported versus inspected evidence](SECURITY.md#14-security-acceptance-checks).

Use the project's configured test tools and scripts.

Do not replace existing tooling without a reason and approval.

## 9. Operational Requirements

Production requires:

- HTTPS.
- A publicly reachable PayMongo webhook endpoint.
- Durable database and image storage.
- Restricted database access.
- Managed secrets.
- Database backups and tested restoration.
- Application and integration monitoring.
- Migration procedures.
- NFC failure procedures after hardware selection.

Hosting providers and deployment domains remain TBD.
