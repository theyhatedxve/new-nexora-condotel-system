# NEXORA — Implementation Guide

## 1. Working Method

For every implementation step:

1. Inspect the current files.
2. Explain the proposed scope.
3. Obtain approval.
4. Provide the exact file path.
5. State whether to create, replace, or insert content.
6. Provide complete copy-paste code for that change.
7. Explain what the code does.
8. Provide applicable commands.
9. Describe expected results.
10. Record actual results before advancing.

Do not overwrite existing work without reviewing it.

Documentation approval does not authorize all application phases.

## 2. Preflight Review

Before continuing development:

- Read applicable AGENTS.md instructions.
- Read Master Architecture v2.1.
- Check the existing frontend folder structure.
- Inspect package scripts and locked versions.
- Inspect the Prisma schema and configuration.
- Check current Git changes.
- Identify the latest approved phase and step.

Do not restart completed work based on outdated architecture status text.

## 3. Phase 01 — Project Foundation

Steps:

1. Verify Node.js and package-manager compatibility.
2. Verify guest React JavaScript/Vite application.
3. Verify admin React JavaScript/Vite application.
4. Verify NestJS TypeScript backend.
5. Configure environment examples.
6. Establish the approved API base path and local CORS.
7. Connect each frontend to a backend health endpoint.
8. Run builds and configured tests.

Pass condition:

Both frontends can reach the backend, and the foundation checks pass.

## 4. Phase 02 — Database Foundation

Steps:

1. Review Prisma and SQLite configuration.
2. Confirm naming, identifiers, money, and date conventions.
3. Review property and room models.
4. Review user and guest models.
5. Review reservation models.
6. Review payment models.
7. Review NFC models.
8. Review audit/settings models.
9. Review indexes and constraints.
10. Approve migrations and seed data separately as required.

Pass condition:

Approved schema validates, migrations work on disposable data, and
relationships/constraints behave as intended.

Schema approval does not automatically authorize database migration.

## 5. Phase 03 — Authentication and RBAC

Steps:

1. Define approved account and session contracts.
2. Implement password hashing.
3. Implement login and refresh rotation.
4. Implement logout and revocation.
5. Add role guards.
6. Add ownership checks.
7. Implement optional guest registration.
8. Test invalid credentials and privilege boundaries.

Pass condition:

Protected APIs reject unauthorized requests and cross-guest access.

## 6. Phase 04 — Room Management

Steps:

1. Implement room-type management.
2. Implement physical-room management.
3. Add amenities.
4. Add approved image uploads.
5. Add rate and capacity validation.
6. Add operational states and dated blocks.
7. Test inventory-reducing changes.

Pass condition:

Authorized staff can manage inventory without violating existing bookings.

## 7. Phase 05 — Guest Website

Steps:

1. Build shared guest layout.
2. Build homepage.
3. Build room listing and details.
4. Add date and capacity search.
5. Show backend-calculated pricing.
6. Add loading, empty, and failure states.
7. Verify narrow-screen and keyboard behavior.

Pass condition:

Guests can discover eligible rooms with clear prices and usable navigation.

## 8. Phase 06 — Reservation System

Steps:

1. Approve hold duration and booking rules.
2. Implement date and capacity checks.
3. Implement concurrency-safe inventory acquisition.
4. Add guest checkout.
5. Add private booking access.
6. Add room assignment history.
7. Add approved lifecycle transitions.
8. Add cancellation.
9. Add check-in/out.
10. Test competing bookings and hold expiration.

Pass condition:

Bookings preserve trusted prices and cannot oversell inventory.

## 9. Phase 07 — Payment System

Steps:

1. Approve detailed payment records and policies.
2. Integrate PayMongo test-mode checkout.
3. Implement verified webhook handling.
4. Add duplicate-safe processing.
5. Add Pay at Property collections.
6. Add authorized refunds.
7. Reconcile late, duplicate, and failed events.
8. Test provider timeouts and return-before-webhook behavior.

Pass condition:

Only trusted payment evidence changes financial state.

## 10. Phase 08 — Admin Dashboard

Steps:

1. Build staff layout and navigation.
2. Add role-appropriate summary cards.
3. Add reservation and guest screens.
4. Add room and payment operational views.
5. Connect filters and pagination.
6. Verify summary definitions against source records.

Pass condition:

Dashboard figures and actions reflect authorized backend data.

## 11. Phase 09 — NFC Management

Steps:

1. Approve card and credential lifecycle.
2. Build simulated cards and assignments.
3. Build issuance and revocation interfaces.
4. Label simulations visibly.
5. Select compatible hardware.
6. Approve the vendor adapter.
7. Test physical access and expiration.
8. Test lost-card revocation and offline behavior.
9. Document emergency procedures.

Pass condition:

Simulation is verified separately from physical hardware behavior.

## 12. Phase 10 — Reports and Settings

Steps:

1. Approve occupancy and revenue definitions.
2. Implement reports from authoritative records.
3. Add access and audit views.
4. Implement validated settings.
5. Audit policy changes.

Pass condition:

Reports reconcile with underlying data and settings are access-controlled.

## 13. Phase 11 — Testing and Security

Verify:

- Complete guest booking journeys.
- Accountless booking access.
- PayMongo and Pay at Property.
- Reservation/payment status separation.
- Inventory contention.
- Role isolation.
- Refund failures.
- NFC failures.
- Upload handling.
- Backup restoration.
- Production-database behavior.

Pass condition:

Critical journeys and failure scenarios pass with recorded evidence.

## 14. Phase 12 — Production Deployment

Steps:

1. Approve hosting and domains.
2. Provision production PostgreSQL.
3. Test production migrations and data transfer.
4. Configure secrets and HTTPS.
5. Configure durable uploads.
6. Register and verify production webhooks.
7. Configure monitoring and reconciliation.
8. Test backups and recovery.
9. Complete operational training.
10. Obtain launch approval.

Pass condition:

The deployment passes functional, security, integration, and recovery checks.

## 15. Command Guidance

Use scripts present in the relevant package.json.

Before giving a command:

- Specify the working directory.
- Check the script or configuration exists.
- Explain whether it reads or changes data.
- State expected output.
- Do not claim success without execution evidence.

If Prisma uses a custom configuration filename, supply the appropriate
explicit configuration path.

Do not assume schema validation creates database tables.

## 16. Step Completion Record

Use this template:

```text
Phase:
Step:
Approved scope:
Files changed:
Checks executed:
Actual results:
Unresolved issues:
Next proposed step:
Approval required before advancement:
```
