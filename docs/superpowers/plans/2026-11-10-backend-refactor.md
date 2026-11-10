# Backend Responsibility Separation Implementation Plan

> Use the executing-plans workflow for implementation and a fresh code reviewer before handoff.

**Goal:** Apply the same responsibility separation as the guest/admin refactors while preserving backend behavior.

**Architecture:** Keep NestJS controllers, DTOs, injected services, and transaction ownership intact. Extract feature-local policy constants, query projections, response mapping, validation, and payment evidence helpers from services. Keep related files beside their feature rather than adding a generic repository layer.

**Tech stack:** Existing NestJS, TypeScript, Prisma, and Vitest. No dependencies or schema changes.

**Spec:** User request to apply the previous behavior-preserving refactor to the backend; local CODING_PRINCIPLES.md, CODING_PATTERNS.md, DEVELOPMENT_RULES.md, and architecture v2.1.

## Constraints

- Preserve routes, DTOs, role checks, response fields, error messages, and ordering.
- Preserve transaction callbacks, payment evidence, idempotency, inventory writes, and provider calls.
- Preserve existing exported symbols through compatibility re-exports where needed.
- No database operations, migrations, provider requests, commits, or frontend edits.
- Follow docs/AGENTS.md owner-run verification: do not run lint, build, tests, or apps. Source inspection and review only; provide commands for the owner.

## Tasks

- [x] Extract auth types/token utilities and availability, report, and audit input helpers.
- [x] Separate room, amenity, image, settings, and staff-list projections/constants from service orchestration.
- [x] Separate refund settlement/evidence and reconciliation queue/evidence helpers, preserving caller-supplied transaction clients.
- [x] Separate reservation policy constants and staff-booking response mapping.
- [x] Review source/import changes and obtain independent review; document actual verification limits and owner commands.

## Resulting Organization

All paths below are relative to `backend/src/`. Controllers continue to handle HTTP and DTOs continue to validate requests. Services retain database-backed authorization and workflow orchestration. Existing focused services/helpers remain in place.

| Responsibility | Files |
| --- | --- |
| Auth response types and token operations | `auth/auth.types.ts`, `auth/refresh-token.ts`, `auth/registration-policy.ts` |
| Availability input rules | `availability/availability-stay.ts` |
| Audit and reporting date filters | `audit/audit-filters.ts`, `reports/collections-report-range.ts` |
| Amenity projection and normalization | `amenities/amenity-projection.ts`, `amenities/amenity-validation.ts` |
| Room query fields and normalization | `rooms/room-query.ts`, `rooms/room-validation.ts` |
| Room type, block, and image projections | `room-types/room-type-projection.ts`, `room-blocks/room-block-query.ts`, `room-images/room-image-projection.ts` |
| Settings fields and policy reference | `settings/property-settings-definition.ts` |
| Staff guest and reservation definitions | `guests/staff-guest-policy.ts`, `reservations/staff-reservation-query.ts` |
| Staff payment response mapping | `payments/staff-payment-projection.ts` |
| Reservation acquisition constants/types | `reservations/reservation-acquisition-policy.ts` |
| Staff booking policy and receipt mapping | `reservations/guest-booking-staff-policy.ts`, `reservations/guest-booking-staff-receipt.ts` |
| Checkout response mapping | `payments/checkout-response.ts` |
| Refund policy and settlement | `payments/refund-policy.ts`, `payments/refund-settlement.ts` |
| Reconciliation evidence/idempotency and queue reads | `payments/reconciliation-evidence.ts`, `payments/reconciliation-queue.ts` |

Constants remain feature-local; no global miscellaneous utility module or new dependency-injection layer was introduced. Extracted transaction helpers accept the original caller-supplied `Prisma.TransactionClient`; services still own transaction creation and provider-call ordering. Original public exports remain available through re-exports. Internal consumers now import moved definitions directly.

## Review Evidence and Limits

- 19 services had responsibilities extracted into 25 feature files; four additional services only needed imports redirected.
- Source-level AST comparison: all 144 inspected method/constructor bodies match the original after expected helper-call substitutions; 49 moved top-level declarations retain their definitions.
- Independent reviewer: all 73 extracted declarations/methods and 139 retained class members preserve their inspected source semantics. All 272 relative named imports across 48 changed/new source files resolve to exported symbols; no helper dependency cycles found.
- The final diff contains no controller, DTO, module registration, frontend, schema, migration, dependency, or existing test changes.
- No tests, lint, builds, apps, databases, or provider calls were run. Source review is not compilation or runtime acceptance.
- Ruling: use direct implementation authorization from the current conversation; do not use Obsidian or require EggPie. Follow local owner-run verification restrictions.

## Review Focus

- Authentication and permission failures must retain their order and messages.
- Refund/reconciliation duplicates must retain request fingerprints and transaction ownership.
- Public and staff projections must retain their exact fields.
- Date boundaries and pagination must retain existing semantics.
- Extracted functions must retain arguments, inferred return types, and all original side effects.

## Owner Verification

From `D:\Web-JSX\NEXORA\backend`:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Use the existing isolated test database setup. Never redirect tests to `backend/dev.db`.
