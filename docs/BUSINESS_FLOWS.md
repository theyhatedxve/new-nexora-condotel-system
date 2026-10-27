# NEXORA — Business Flows

## 1. Room Search

```text
Guest selects dates and guest count
                 ↓
Backend validates input
                 ↓
Backend evaluates dated inventory and capacity
                 ↓
Guest sees eligible room types and current rates
```

Search does not guarantee inventory until the backend safely acquires it.

## 2. Guest Booking

```text
Select room type
      ↓
Enter guest details
      ↓
Review backend-calculated amount and policies
      ↓
Select payment method
      ↓
Backend rechecks inventory
      ↓
Create reservation under the applicable hold/confirmation policy
```

Guest accounts are optional.

For accountless bookings, issue access only through the approved private
verification mechanism.

## 3. PayMongo Checkout

1. Validate the reservation and the caller's access.
2. Safely acquire or validate the inventory hold.
3. Calculate the expected amount in NestJS.
4. Record the payment attempt.
5. Create the hosted checkout session.
6. Send the guest to PayMongo.
7. Receive the signed payment event.
8. Verify authenticity and expected payment details.
9. Process the event once.
10. Update payment and reservation records under the approved policy.
11. Display the result obtained from the backend.

A browser redirect may arrive before the verified event.
Show Processing when payment verification is incomplete.

If checkout creation fails, retain a recoverable attempt state.
Do not create duplicate sessions blindly after a network timeout.

## 4. Pay at Property

1. Guest selects Pay at Property.
2. Backend validates booking details and inventory.
3. Eligible booking becomes Confirmed.
4. Payment remains Unpaid.
5. Show arrival and payment instructions.
6. Staff collects payment.
7. Authorized staff records the collection.
8. Recalculate the payment summary.

Arrival cutoffs and no-show rules remain TBD.

## 5. Hold Expiration

1. Compare holdExpiresAt with backend time.
2. Exclude expired holds from current inventory calculations.
3. Record expiration through a safe state transition.
4. Stop treating the expired reservation as confirmed inventory.
5. Require fresh availability before resuming the booking.

An expired hold stops consuming inventory even when a cleanup task
has not yet updated its status.

A late successful payment requires reconciliation.
Do not silently revive an expired booking.

## 6. Room Assignment

1. Verify staff permission.
2. Verify the reservation is eligible.
3. Select a physical room of the reserved type.
4. Check blocks and conflicting assignments.
5. Preserve any previous assignment history.
6. Save the new assignment safely.

Do not assign a room based only on its current Ready status.

## 7. Check-in

1. Verify staff permission.
2. Find the reservation.
3. Verify guest identity under property procedure.
4. Confirm the reservation is eligible for check-in.
5. Check the applicable payment policy.
6. Assign or validate the physical room.
7. Confirm operational readiness.
8. Record check-in and update operational state.
9. Issue approved NFC access or an explicitly simulated assignment.

The required payment condition for check-in must be agreed as policy.

## 8. Check-out

```text
Authorized checkout
        ↓
Validate stay and applicable settlement policy
        ↓
Record checkout
        ↓
Room enters Cleaning
        ↓
Initiate credential revocation
        ↓
Track pending/failed device actions
        ↓
Housekeeping verifies room
        ↓
Room becomes Ready
```

Persist device-revocation intent with the checkout outcome.

Do not show a credential as physically revoked until the selected hardware
provides the required confirmation.

## 9. Cancellation and Refund

1. Verify ownership or staff permission.
2. Evaluate the approved cancellation policy.
3. Apply an allowed reservation transition.
4. Release relevant future inventory.
5. Preserve assignment and payment history.
6. Determine whether a refund is permitted.
7. Require Manager or Administrator authorization for refund processing.
8. Submit the refund through the applicable method.
9. Record pending, successful, or failed outcomes.

Cancellation does not automatically mean refund success.

Cancellation fees and refund rules remain TBD.

## 10. Maintenance Block

1. Authorized staff selects a room and date interval.
2. Backend validates the interval.
3. Check physical assignments.
4. Check affected unassigned reservations and room-type capacity.
5. Reject the block or require an approved operational resolution.
6. Save the block and audit the action.

Do not remove promised inventory without addressing existing bookings.

## 11. Lost NFC Card

1. Verify the guest and active stay.
2. Mark the old card/credential according to the approved lifecycle.
3. Initiate revocation.
4. Track device acknowledgment or failure.
5. Authorize a replacement.
6. Apply the same room and validity restrictions.
7. Record staff action.

Offline revocation behavior depends on hardware.

## 12. Failure Handling

| Failure | Required response |
|---|---|
| Two guests request the last inventory | One succeeds; the other receives a conflict |
| Duplicate payment webhook | No duplicate payment effect |
| Payment after hold expiration | Record and reconcile; safely recheck inventory |
| Checkout return before webhook | Show verification pending |
| Invalid status transition | Reject without partial business changes |
| Door offline during revocation | Keep pending/failure visible and follow procedure |
| Refund timeout | Reconcile provider state before retrying |
| Database failure | Roll back the database operation where applicable |

## 13. Business Acceptance Checks

- Accountless guest can complete an authorized booking.
- A guest cannot read another guest's booking.
- Pay at Property can be Confirmed and Unpaid.
- Client prices cannot override backend prices.
- Expired holds do not reduce availability.
- Conflicting requests cannot oversell inventory.
- Checkout preserves history and starts required follow-up work.
- Simulated NFC behavior is clearly identified.
