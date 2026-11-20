# NEXORA

## Current source organization — 2026-11-20

**Status:** Admin frontend, Guest frontend, and backend arrangement
completed, owner-confirmed.

Both frontends group code under src/app/, src/features/, and src/shared/.
Their src/main.jsx entry points remain in place.
Guest images and branding remain under src/assets/.

Backend Reservations and Payments use smaller feature subfolders.
Module entry files remain at their original module roots.

Source comparison found changes limited to file locations and relative
import paths. Guest asset hashes were unchanged.
Runtime completion is owner-confirmed; the assistant did not run checks.

Application data remains in backend/dev.db.
backend/nexora.demo.db remains separate. Tests use isolated databases.
All 14 migrations, uploaded images, encryption configuration, and
recovery copies are retained.

See:
- [Current directory map](docs/DIRECTORY_STRUCTURE.md)
- [Current handoff and command paths](docs/AI_HANDOFF.md)
- [Owner-confirmed checkpoint](docs/MD_Files/AGENTS.md)

Earlier checkpoints below are historical. Their previous source paths
and pending organization tasks are superseded by this checkpoint.

NFC remains postponed. Production deployment remains deferred.

## Current project checkpoint — 2026-11-20

**Status:** Cleanup Batches 1–5 completed, owner-confirmed.
Documentation closure and consolidated final verification remain pending.

The latest cleanup removes four unused Dashboard files, extracts
backend command validation and Admin form logic, and consolidates
common dialog styling.

The starter E2E test has been replaced with an isolated smoke suite.
It checks database isolation, the health endpoint, and an unauthenticated
protected request. It does not establish full booking acceptance.

- Development database: backend/dev.db.
- Demonstration database: backend/nexora.demo.db.
- Admin and Guest share the backend at http://localhost:3000/api.
- Automated tests use isolated databases.
- All 14 Prisma migrations and existing recovery archives are retained.

No application data was merged, reset, or reseeded in this cleanup.

Completion is owner-confirmed. Source review is separate from runtime
verification; no consolidated final successful totals are recorded here.

See [the current handoff](docs/AI_HANDOFF.md) for final commands and
[the current checkpoint](docs/MD_Files/AGENTS.md) for continuation rules.

NFC remains postponed. Production deployment remains deferred.

The November 19 checkpoint and earlier entries below are historical.
Their statements describing the starter E2E fixture as unfinished
are superseded by this checkpoint.

## Current project checkpoint — 2026-11-19

**Status:** Local prototype and cleanup accepted, owner-confirmed.

Completed work includes the Admin UI redesign, guest account booking,
guest-phone encryption, navigation corrections, unused-file cleanup,
database configuration standardization, and backend file organization.

| Component | Local address |
|---|---|
| Backend API | http://localhost:3000/api |
| Guest website | http://localhost:5175 |
| Admin website | http://localhost:5176 |

The active development database is backend/dev.db.
backend/nexora.demo.db remains available for synthetic demonstrations.

Both DATABASE_URL and NEXORA_RUNTIME_DATABASE_URL must point to the
intended database. Tests use isolated databases.

Reservation policies are grouped under backend/src/reservations/policies/.
PayMongo integration files are grouped under backend/src/payments/paymongo/.

Old databases and expanded recovery copies were archived.
All 14 Prisma migrations remain preserved and are still required.

Completion is owner-confirmed. Final successful rerun output and exact
test totals were not supplied after the last reported timeout.

The separate legacy test:e2e fixture remains unfinished.
NFC functionality is postponed. Production deployment is deferred.

Start with [Local Prototype Setup](docs/LOCAL_PROTOTYPE_SETUP.md).
See [the current checkpoint](docs/MD_Files/AGENTS.md) for continuation rules.

Older checkpoints below are historical and do not define current pending work.

## Historical checkpoint — 2026-11-15

Guest Account Booking Steps 1-4 and Step 5 source cleanup are applied. Website
booking requires verified guest login and account ownership. Admin UI redesign
is owner-confirmed complete. Step 5 is in progress during test database recovery.
The latest owner run reported 33 failed tests, 583 passed, and 53 skipped.
Backend build passed. The final lint correction and database recovery await
owner rechecks. See [current status and evidence](docs/MD_Files/AGENTS.md).

**Condotel Management System**

NEXORA is a web-based system for managing one condotel property. It is designed
to bring room information, reservations, guest services, payments, and daily
property operations into one platform.

The system aims to make booking easier for guests and help staff organize their
work from a shared administrative workspace.

## Who the System Is For

- **Guests** who want to explore rooms, make reservations, and manage their stays.
- **Reception staff** who handle bookings, guest assistance, check-in, and check-out.
- **Property managers** who oversee room availability and daily operations.
- **Administrators** who manage staff access and system settings.

## System Capabilities

The source supports the following areas. Current owner acceptance and remaining
verification are recorded in the development checkpoint. NFC hardware work is postponed.

| Area | Intended capabilities |
|---|---|
| Room discovery | Browse room types, amenities, photos, and availability |
| Reservations | Book stays, review booking details, and manage reservations |
| Guest services | Verified guest accounts, My Bookings, and owned reservation details |
| Reception operations | Coordinate room assignments, check-in, and check-out |
| Payments | Support online checkout and payment at the property |
| Room management | Organize room information, rates, and operational status |
| NFC access management | Manage guest access cards, subject to compatible hardware and testing |
| Reports | Review occupancy, reservations, and financial summaries |
| Administration | Manage staff access, property settings, and activity records |

## System Applications

NEXORA consists of three connected applications:

1. **Guest Website** — the public interface for discovering rooms and arranging stays.
2. **Admin Dashboard** — the staff workspace for property operations.
3. **Backend API** — the shared application service supporting both interfaces.

The frontend applications use React with JavaScript and JSX. The backend uses
NestJS with TypeScript.

## Project Organization

```text
NEXORA/
├── frontend/
│   ├── guest-web/    # Guest Website
│   └── admin-web/    # Admin Dashboard
├── backend/          # Shared Backend API
├── docs/             # Project documentation
└── README.md         # System overview
```

## Historical development status — 2026-11-15

| Phase | Owner-confirmed status |
|---|---|
| Phases 1-8 | COMPLETED |
| Phase 9 - NFC | POSTPONED |
| Phase 10 - Reports and Settings | COMPLETED |
| Phase 11 - Testing and Security | PAUSED and incomplete |
| Phase 12 - Deployment | DEFERRED |

The current work is the Guest Account Booking upgrade. Steps 1-4 and Step 5
source cleanup are applied. Step 5 remains in progress during isolated database
recovery, owner regression checks, and browser acceptance. These checks apply to
the current upgrade and do not resume the paused Phase 11 program.

See [AGENTS.md](docs/MD_Files/AGENTS.md) for current source, owner results, and recovery.

## Project Scope

The initial system serves a single condotel property. Its focus is guest
booking, reception workflows, room management, payment handling, and property
administration. Physical NFC access depends on hardware selection and
integration testing.


## Test-mode online checkout

Authenticated guests can prepare and resume PayMongo test checkout from owned reservation details. Signed webhook processing records verified payment. The browser return displays the backend result.


## Verified test-mode payment recording

Step 7.3 adds signed PayMongo test webhook processing. Guest pages read protected backend payment summaries; browser returns alone never establish payment success. Reception still completes check-in. See docs/MD_Files/AGENTS.md for verification results and pending owner/provider acceptance.
