# NEXORA — Coding Patterns

## 1. Pattern Selection

Use a pattern when it makes an approved feature clearer or safer.

Preferred foundations:

- React composition.
- Small custom hooks.
- Frontend API services.
- NestJS controller/service separation.
- DTO validation.
- Dependency injection.
- Explicit state transitions.
- Database transactions.
- Integration adapters where needed.

Examples below illustrate structure.
They are not complete authorized feature implementations.

## 2. React Component Composition

A reusable component receives data through props.

Example file:

frontend/guest-web/src/components/RoomCard.jsx

```jsx
export default function RoomCard({ roomType, onViewDetails }) {
  return (
    <article className="room-card">
      <h2>{roomType.name}</h2>
      <p>Up to {roomType.capacity} guests</p>

      <button
        type="button"
        onClick={() => onViewDetails(roomType.id)}
      >
        View details
      </button>
    </article>
  );
}
```

The component displays room data.
It does not calculate inventory or authorize bookings.

## 3. Frontend API Service

Keep request details outside presentational components.

Example file:

frontend/guest-web/src/services/roomTypesApi.js

```js
export function createRoomTypesApi(apiClient) {
  return {
    async list(params = {}) {
      const response = await apiClient.get("/room-types", { params });
      return response.data;
    },
  };
}
```

The injected Axios instance owns the approved base URL and session behavior.

Use a similar instance in the admin application.
Do not introduce cross-application packaging until it provides clear value.

## 4. Custom Hook Pattern

Use hooks for repeated stateful UI behavior.

Examples:

- Availability loading.
- Pagination state.
- Session state.
- Debounced search.

A data-loading hook should account for:

- Loading.
- Success.
- Failure.
- Request cancellation.
- Stale responses.

Do not copy server data into multiple independent states without need.

## 5. NestJS Controller and Service

Recommended feature structure:

```text
backend/src/reservations/
├── dto/
│   ├── create-reservation.dto.ts
│   └── reservation-response.dto.ts
├── reservations.controller.ts
├── reservations.service.ts
└── reservations.module.ts
```

Responsibilities:

```text
Controller
  → Receives HTTP input
  → Uses guards and validated DTOs
  → Calls service
  → Returns approved response

Service
  → Applies business rules
  → Checks record ownership where required
  → Coordinates database work
  → Calls integration boundaries
```

Do not place business rules in route decorators or frontend pages.

## 6. DTO Boundary

Use separate input and output contracts.

Input DTOs:

- Allow intended client fields.
- Validate type and format.
- Bound lengths and values.
- Reject privileged field assignment.

Output DTOs:

- Return only permitted information.
- Exclude hashes and secrets.
- Keep public and staff projections distinct.

DTO validation does not replace database-backed ownership checks.

## 7. Explicit State Transitions

Reservation changes should use named business operations.

Examples:

- confirmReservation.
- cancelReservation.
- checkInReservation.
- checkOutReservation.

Each operation checks:

1. Actor permission.
2. Current state.
3. Required related records.
4. Inventory/payment policy.
5. Allowed transition.
6. Database effects.
7. Audit and integration follow-up.

Avoid unrestricted updateStatus endpoints.

## 8. Transaction Pattern

Conceptual inventory operation:

```text
Begin short transaction
    ↓
Read current inventory and active commitments
    ↓
Validate the requested operation
    ↓
Write reservation/assignment changes
    ↓
Commit
```

If the database reports a retryable concurrency conflict:

1. Retry a bounded number of times.
2. Re-read current inventory.
3. Re-evaluate the decision.
4. Return a clear conflict when inventory is no longer available.

The transaction strategy must work across application instances.
An in-memory lock alone is insufficient.

## 9. External Integration Adapter

Use a focused adapter for PayMongo and selected NFC hardware.

```text
Business service
      ↓
Integration adapter
      ↓
External provider/device
```

Business services should not depend on vendor payload details everywhere.

Keep:

- Provider mapping.
- Authentication.
- Safe request handling.
- Provider-specific errors.

inside the integration boundary.

Do not create adapters for hypothetical providers.

## 10. Idempotent Processing

For a verified provider event:

```text
Receive event
      ↓
Authenticate and validate
      ↓
Identify event uniquely
      ↓
Check durable processing state
      ↓
Apply business effects once
      ↓
Record processing outcome
```

Concurrency protection must prevent two handlers from applying the
same event simultaneously.

A record that says Received is not equivalent to Processed successfully.

## 11. Durable Follow-up Work

Some operations cross database and external-system boundaries.

Example:

Checkout commits, but a door is offline.

Recommended implementation direction:

1. Persist the checkout and required follow-up intent.
2. Attempt device revocation.
3. Record acknowledgment or failure.
4. Retry safely.
5. Expose unresolved work to staff.

The exact durable-task schema requires approval.

Do not add a message broker or distributed workflow platform by default.

## 12. Repository Pattern

An additional repository layer is optional.

Use it when it provides a concrete benefit, such as:

- Complex reused persistence logic.
- A stable domain boundary.
- Multiple actual persistence implementations.

A focused NestJS service using Prisma directly may be simpler.

Do not wrap every Prisma method with an identical repository method.

## 13. Pattern Checklist

- Does this pattern solve a current problem?
- Are responsibilities clear?
- Can a new developer follow the data flow?
- Are authorization and ownership visible?
- Are retries duplicate-safe?
- Is history preserved?
- Are external failures represented honestly?
- Can unnecessary layers be removed?
