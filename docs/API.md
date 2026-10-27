# NEXORA — REST API Documentation

## 1. Contract Status

Master Architecture v2.1 approves REST API domains and example routes.

The methods, payloads, response envelopes, pagination rules, and error codes
below form a proposed contract.

Review them against implemented controllers before treating them as live.

## 2. General Conventions

Proposed conventions:

- Base path: /api
- JSON request and response bodies, except approved upload endpoints.
- Opaque string identifiers.
- camelCase JSON properties.
- Integer centavos for monetary amounts.
- YYYY-MM-DD for stay dates.
- ISO 8601 UTC timestamps for events.
- Server-calculated prices.
- Explicit response DTOs.

Never return password hashes, refresh-token hashes, provider secrets,
or NFC cryptographic material.

## 3. Access Categories

| Category | Requirement |
|---|---|
| Public | No account required; limited public information |
| Guest-owned | Authenticated ownership or approved private booking verification |
| Staff | Valid staff authentication and appropriate role |
| Provider | Verified PayMongo webhook |
| Device | Approved device authentication; protocol TBD |

Guest booking verification must provide scoped access.
A reservation reference alone must not grant access.

The exact accountless verification mechanism remains TBD.

## 4. Authentication Routes

| Method | Proposed route | Access |
|---|---|---|
| POST | /auth/register | Public; guest accounts only |
| POST | /auth/login | Public; rate limited |
| POST | /auth/refresh | Valid refresh session |
| POST | /auth/logout | Current session |

Public registration must never accept a privileged role assignment.

Token transport, cookie settings, CSRF protection, and session-expiry
values require an approved authentication contract.

## 5. Rooms and Availability

| Method | Proposed route | Access |
|---|---|---|
| GET | /room-types | Public projection |
| GET | /room-types/:id | Public projection |
| POST | /room-types | Manager / Administrator |
| PATCH | /room-types/:id | Manager / Administrator |
| GET | /rooms | Receptionist / Manager / Administrator |
| POST | /rooms | Manager / Administrator |
| PATCH | /rooms/:id | Manager / Administrator |
| GET | /availability | Public; rate limited |

Proposed availability request:

```http
GET /api/availability?checkInDate=2026-11-10&checkOutDate=2026-11-12&guestCount=2
```

Proposed response:

```json
{
  "data": [
    {
      "roomTypeId": "room-type-example",
      "name": "Deluxe Suite",
      "available": true,
      "nightlyRateCentavos": 250000,
      "totalAmountCentavos": 500000,
      "currency": "PHP"
    }
  ]
}
```

Availability responses are informational.
Inventory must be checked again when creating or confirming a booking.

## 6. Reservations

| Method | Proposed route | Access |
|---|---|---|
| POST | /reservations | Public guest checkout or authorized staff |
| GET | /reservations | Staff; guest listings must be ownership scoped |
| GET | /reservations/:id | Verified owner or authorized staff |
| POST | /reservations/:id/cancel | Verified owner under policy or authorized staff |
| POST | /reservations/:id/assign-room | Receptionist / Manager / Administrator |
| POST | /reservations/:id/check-in | Receptionist / Manager / Administrator |
| POST | /reservations/:id/check-out | Receptionist / Manager / Administrator |

Proposed creation request:

```json
{
  "roomTypeId": "room-type-example",
  "checkInDate": "2026-11-10",
  "checkOutDate": "2026-11-12",
  "guestCount": 2,
  "guest": {
    "firstName": "Sample",
    "lastName": "Guest",
    "email": "guest@example.com",
    "phone": "+639000000000"
  },
  "paymentMethod": "PAY_AT_PROPERTY"
}
```

The backend derives:

- Trusted account association.
- Initial reservation state.
- Applicable rate.
- Total amount.
- Reservation number.
- Hold deadline when required.

Do not accept client-supplied prices or privileged statuses.

## 7. Payments

| Method | Proposed route | Access |
|---|---|---|
| POST | /payments/checkout | Verified reservation owner or authorized staff |
| GET | /reservations/:id/payments | Verified owner or authorized staff |
| POST | /reservations/:id/payments | Receptionist / Manager / Administrator; property collections |
| POST | /payments/:id/refunds | Manager / Administrator |
| POST | /webhooks/paymongo | Verified provider request |

The checkout request identifies the reservation.
NestJS determines the expected payable amount.

The webhook handler must authenticate the event, validate its association,
and apply duplicate-safe processing.

## 8. Users, Guests, NFC, and Operations

| Method | Proposed route | Access |
|---|---|---|
| GET / POST / PATCH | /users and /users/:id | Administrator |
| GET / PATCH | /guests and /guests/:id | Authorized staff; separate ownership rules for guests |
| GET / POST | /nfc/cards | Receptionist / Manager / Administrator |
| POST | /nfc/assignments | Receptionist / Manager / Administrator |
| POST | /nfc/assignments/:id/revoke | Receptionist / Manager / Administrator |
| GET | /dashboard | Authorized staff; role-filtered data |
| GET | /reports | Manager / Administrator |
| GET / PATCH | /settings | Administrator |
| GET | /audit-logs | Proposed: Manager / Administrator; final policy TBD |

Each method must have its own authorization rule.

Do not assume all actions in a route group share identical permissions.

## 9. Pagination

Proposed list parameters:

- page: positive integer.
- pageSize: bounded positive integer.
- search: optional.
- sortBy: allowlisted field.
- sortOrder: asc or desc.

Proposed response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Apply ownership and role filters before counting records.

## 10. Error Contract

Proposed response:

```json
{
  "error": {
    "code": "INVENTORY_UNAVAILABLE",
    "message": "The selected room type is unavailable for these dates.",
    "requestId": "request-example"
  }
}
```

| HTTP status | Use |
|---|---|
| 400 | Invalid request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not permitted |
| 404 | Record unavailable; may also protect private-record existence |
| 409 | Inventory conflict, invalid transition, or idempotency conflict |
| 429 | Rate limit reached |
| 500 | Unexpected server error |

Never expose stack traces, SQL errors, or secrets.

## 11. Idempotency

Proposed use: an Idempotency-Key header for retry-sensitive operations.

The backend should associate the key with:

- Verified actor or secure guest checkout context.
- Operation.
- Request fingerprint.
- Processing state.
- Stored result.

Reusing a key with a different payload must fail.

Provider-event deduplication uses the provider event identity.
It is separate from client-request idempotency.

Retention and retry behavior remain TBD.

## 12. Contract Verification

Test:

1. Valid requests.
2. Invalid dates and capacity.
3. Missing authentication.
4. Wrong role.
5. Access to another guest's reservation.
6. Duplicate requests.
7. Conflicting inventory requests.
8. Unexpected provider events.
9. Response fields that must remain private.
