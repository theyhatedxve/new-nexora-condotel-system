# NEXORA

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

## Planned Capabilities

These capabilities describe the intended system. Development is ongoing;
completion of the project and database foundations does not mean all features
are available.

| Area | Intended capabilities |
|---|---|
| Room discovery | Browse room types, amenities, photos, and availability |
| Reservations | Book stays, review booking details, and manage reservations |
| Guest services | Support optional guest accounts and booking without an account |
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

As of **October 28, 2026**:

| Phase | Status |
|---|---|
| Phase 1 — Project Foundation | Complete |
| Phase 2 — Database Foundation | Complete, as confirmed by the project owner |
| Phase 3 — Authentication and Access Control | Next planned phase; not started |
| Remaining development phases | Planned |

The current foundation includes the starter guest and admin applications,
backend connectivity, and database structure. Operational features will be
implemented and verified in later phases. The system is under development and
has not been declared ready for production use.

## Project Scope

The initial system serves a single condotel property. Its focus is guest
booking, reception workflows, room management, payment handling, and property
administration. Physical NFC access depends on hardware selection and
integration testing.
