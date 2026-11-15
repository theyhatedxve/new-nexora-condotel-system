# NEXORA

## Current development checkpoint — 2026-11-15

Guest Account Booking Steps 1-4 and Step 5 source cleanup are applied. Website
booking requires verified guest login and account ownership. Admin UI redesign
is owner-confirmed complete. Step 5 is in progress during test database recovery.
The latest owner run reported 33 failed tests, 583 passed, and 53 skipped.
Backend build passed. The final lint correction and database recovery await
owner rechecks. See [current status and evidence](docs/AGENTS.md).

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

## Development Status

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

See [AGENTS.md](docs/AGENTS.md) for current source, owner results, and recovery.

## Project Scope

The initial system serves a single condotel property. Its focus is guest
booking, reception workflows, room management, payment handling, and property
administration. Physical NFC access depends on hardware selection and
integration testing.


## Test-mode online checkout

Authenticated guests can prepare and resume PayMongo test checkout from owned reservation details. Signed webhook processing records verified payment. The browser return displays the backend result.


## Verified test-mode payment recording

Step 7.3 adds signed PayMongo test webhook processing. Guest pages read protected backend payment summaries; browser returns alone never establish payment success. Reception still completes check-in. See docs/AGENTS.md for verification results and pending owner/provider acceptance.
