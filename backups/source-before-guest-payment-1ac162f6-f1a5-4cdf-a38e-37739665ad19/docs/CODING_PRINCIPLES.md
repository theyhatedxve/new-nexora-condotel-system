# NEXORA — Coding Principles

## 1. Purpose

Write code that is easy to understand, review, test, and maintain.

Apply principles to solve actual problems.
Do not introduce extra layers merely to demonstrate a principle.

## 2. SOLID

### 2.1 Single Responsibility

A module, class, or function should have a clear responsibility.

NEXORA examples:

- Controller: HTTP input/output.
- DTO: request validation.
- Reservation service: reservation rules.
- Payment adapter: provider communication.
- React component: one coherent interface responsibility.

Avoid a controller that validates inventory, calculates prices,
calls PayMongo, and writes audit records directly.

### 2.2 Open/Closed

Extend behavior through a clear boundary when variation is established.

Example:

A selected NFC hardware adapter implements the approved device boundary.

Do not create a generic multi-provider framework before it is needed.

### 2.3 Liskov Substitution

Implementations of a shared contract must preserve its promises.

Example:

A simulated NFC adapter must return the documented simulation result.
It must not pretend that a real door has unlocked.

A physical adapter must report failure when it cannot perform the operation.

### 2.4 Interface Segregation

Give consumers only the capabilities they need.

Example:

A room listing requires public room data.
It should not depend on staff-only guest or payment-management operations.

Avoid one large service contract used by every module.

### 2.5 Dependency Inversion

Business rules should depend on a stable boundary where external details vary.

Examples:

- Payment business logic calls a PayMongo integration boundary.
- NFC authorization calls a hardware adapter.
- NestJS dependency injection supplies the implementation.

Direct Prisma use in a focused service is acceptable when an extra
repository layer provides no practical benefit.

## 3. ACID

ACID describes database transaction properties.

| Property | Meaning | NEXORA example |
|---|---|---|
| Atomicity | Coordinated database changes succeed or roll back together | Reservation and related hold records |
| Consistency | Declared constraints and enforced invariants remain valid | Valid references and approved state changes |
| Isolation | Concurrent operations are controlled | Competing requests for the last room |
| Durability | Committed data survives according to the database's guarantees | Recorded reservation survives restart |

Important limits:

- ACID does not create business rules automatically.
- A transaction at an unsuitable isolation level may still allow a race.
- A SQL rollback cannot undo an external payment or door action.
- Backups and restoration remain necessary.

Keep transactions short.
Avoid external network calls inside inventory transactions.

## 4. CRUD

CRUD means Create, Read, Update, Delete.

| Operation | Typical HTTP method | NEXORA example |
|---|---|---|
| Create | POST | Create room type |
| Read | GET | Read room details |
| Update | PATCH | Update room description |
| Delete | DELETE | Remove an eligible unused record |

CRUD is an organizing concept, not a requirement to expose unrestricted
operations on every model.

Business actions need explicit rules:

- Confirm reservation.
- Check in.
- Check out.
- Cancel reservation.
- Record payment.
- Issue refund.
- Revoke credential.

Do not implement cancellation by deleting the reservation.

## 5. DRY — Don't Repeat Yourself

Keep authoritative business knowledge in one appropriate place.

Examples:

- Backend pricing rules.
- Reservation transition rules.
- Reusable Axios configuration.
- Shared formatting utilities.
- CSS tokens.

Frontend usability validation and backend enforcement may both exist.
They serve different trust boundaries.

Do not force unrelated features into one abstraction because their code
happens to look similar.

## 6. KISS — Keep It Simple

Prefer:

- Clear names.
- Short, focused functions.
- Explicit conditions.
- Small modules.
- Direct control flow.
- Minimal dependencies.

Avoid:

- Deep inheritance.
- Unnecessary factories.
- Generic CRUD frameworks.
- Premature microservices.
- Clever code that requires repeated explanation.

Simple code must still enforce security and correctness.

## 7. YAGNI — You Aren't Gonna Need It

Implement approved current needs.

Examples:

- One property, not a speculative multi-tenant platform.
- Flat nightly rates, not an unapproved dynamic-pricing engine.
- PayMongo, not a generic gateway marketplace.
- Hardware simulation until NFC devices are selected.

Leave a clear boundary when future integration is already required.
Do not build the future feature early.

## 8. Trusted Data

The backend decides:

- Prices.
- Inventory.
- Roles.
- Ownership.
- Reservation transitions.
- Payment verification.
- NFC authorization.

The frontend displays these decisions and collects input.

## 9. Error Handling

- Fail with a clear business reason.
- Preserve useful context.
- Avoid empty catch blocks.
- Do not replace failures with success-shaped data.
- Log safe diagnostic information.
- Keep private details out of user-facing errors.

## 10. Maintainability Review

Before completing a change:

1. Is the responsibility clear?
2. Are names understandable?
3. Are business rules in the correct layer?
4. Is any abstraction unnecessary?
5. Are money and date semantics explicit?
6. Are permissions enforced?
7. Can partial failure be recovered?
8. Is the important behavior verified?
