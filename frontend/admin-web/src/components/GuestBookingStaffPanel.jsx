import {
  hasGuestBookingPolicyFields,
  isPropertyBookingRequest,
} from "../services/guestBookingStaffApi";
import { formatStatus, formatTimestamp } from "../utils/formatters";
import { staffRoles, actionTitles } from "../constants/guestBookingStaffPanel.js";
import useGuestBookingStaffPanel from "../hooks/useGuestBookingStaffPanel.js";

export default function GuestBookingStaffPanel({ record, payment, onReload }) {
  const {
    authStatus,
    user,
    prefix,
    channel,
    guestAgreed,
    reason,
    review,
    busy,
    formError,
    outcome,
    reviewHeading,
    message,
    booking,
    financialStateReady,
    timingReady,
    overdue,
    pending,
    canAct,
    canConfirm,
    reviewChanged,
    backToForm,
    submitReview,
    changeChannel,
    reviewContact,
    changeGuestAgreed,
    reviewConfirm,
    changeReason,
    reviewReject,
  } = useGuestBookingStaffPanel({ record, payment, onReload });

  if (
    authStatus !== "authenticated" ||
    !staffRoles.includes(user?.role) ||
    record.status !== "ready"
  ) {
    return null;
  }

  if (!hasGuestBookingPolicyFields(booking)) {
    return (
      <section className="content-card record-section">
        <h2>Guest request confirmation</h2>
        <p role="alert">
          Booking policy details are unavailable. Refresh details before using staff
          confirmation.
        </p>
      </section>
    );
  }

  if (!isPropertyBookingRequest(booking)) return null;

  return (
    <section
      className="content-card record-section reservation-actions"
      aria-labelledby={`${prefix}-heading`}
      aria-busy={busy}
    >
      <h2 id={`${prefix}-heading`}>Pay at Property request</h2>
      <p>
        Record contact already made by phone or email. Confirmation requires the guest’s
        explicit agreement and does not record a payment.
      </p>

      <dl className="record-fields">
        <div>
          <dt>Reservation status</dt>
          <dd>{formatStatus(booking.status)}</dd>
        </div>
        <div>
          <dt>Expected arrival · Philippine time</dt>
          <dd>{formatTimestamp(booking.expectedArrivalAt)}</dd>
        </div>
        <div>
          <dt>First staff contact</dt>
          <dd>
            {booking.firstContactedAt
              ? formatTimestamp(booking.firstContactedAt)
              : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Guest response deadline · Philippine time</dt>
          <dd>
            {booking.responseDeadlineAt
              ? formatTimestamp(booking.responseDeadlineAt)
              : "Starts after first contact"}
          </dd>
        </div>
        <div>
          <dt>Current confirmation deadline · Philippine time</dt>
          <dd>
            {booking.holdExpiresAt
              ? formatTimestamp(booking.holdExpiresAt)
              : "Not applicable"}
          </dd>
        </div>
        <div>
          <dt>Confirmed at · Philippine time</dt>
          <dd>{formatTimestamp(booking.confirmedAt)}</dd>
        </div>
      </dl>

      <p>
        First contact starts a 24-hour response window. Repeated contact does not extend
        it. The earlier deadline applies: the response deadline or 30 minutes after
        expected arrival.
      </p>

      {outcome && (
        <p
          ref={message}
          tabIndex={-1}
          role={outcome.success ? "status" : "alert"}
          className="action-review"
        >
          {outcome.text}
        </p>
      )}
      {pending && !timingReady && (
        <p role="alert">Booking timing requires review. Staff actions are unavailable.</p>
      )}
      {pending && overdue && (
        <p role="alert">
          The confirmation deadline has passed. Refresh details to check the processed
          reservation status.
        </p>
      )}
      {pending && !financialStateReady && (
        <p role="status">
          Staff confirmation requires current unpaid payment records without a pending
          attempt or financial review. Check the payment summary and refresh details.
        </p>
      )}
      {!pending && (
        <p>
          This request is {formatStatus(booking.status).toLowerCase()}. Pending-request
          actions are unavailable.
        </p>
      )}
      {formError && <p role="alert">{formError}</p>}

      {pending && !review && (
        <>
          <fieldset className="action-fields" disabled={!canAct}>
            <legend>Record completed contact</legend>
            <label htmlFor={`${prefix}-channel`}>Contact channel</label>
            <select id={`${prefix}-channel`} value={channel} onChange={changeChannel}>
              <option value="">Choose a channel</option>
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
            </select>
            <p>This records contact; it does not place a call or send an email.</p>
            <button type="button" onClick={reviewContact}>
              Review contact
            </button>
          </fieldset>

          <fieldset className="action-fields" disabled={!canConfirm}>
            <legend>Confirm guest agreement</legend>
            <label className="action-checkbox">
              <input type="checkbox" checked={guestAgreed} onChange={changeGuestAgreed} />
              <span>
                I contacted the guest and they explicitly agreed to keep this reservation.
              </span>
            </label>
            <button type="button" onClick={reviewConfirm}>
              Review confirmation
            </button>
          </fieldset>

          <fieldset className="action-fields" disabled={!canAct}>
            <legend>Reject request</legend>
            <label htmlFor={`${prefix}-reason`}>Rejection reason</label>
            <textarea
              id={`${prefix}-reason`}
              value={reason}
              maxLength={500}
              rows={3}
              onChange={changeReason}
            />
            <p>Enter 3–500 characters. Avoid unnecessary private information.</p>
            <button type="button" className="danger-button" onClick={reviewReject}>
              Review rejection
            </button>
          </fieldset>
        </>
      )}

      {review && (
        <div className="action-confirmation">
          <h3 ref={reviewHeading} tabIndex={-1}>
            {actionTitles[review.kind]}
          </h3>
          <p>
            Booking: <strong>{booking.reservationNumber}</strong>
          </p>
          {review.kind === "contact" && (
            <p>
              Record completed contact by <strong>{review.channel.toLowerCase()}</strong>.
              Existing first-contact deadlines will not be extended.
            </p>
          )}
          {review.kind === "confirm" && (
            <p>
              Confirm that the guest explicitly agreed to this stay. The backend will
              recheck deadlines and inventory. No payment or check-in is recorded.
            </p>
          )}
          {review.kind === "reject" && (
            <>
              <p>Reject this pending request and release its inventory commitment.</p>
              <p>Reason: {review.reason}</p>
            </>
          )}
          {reviewChanged && (
            <p role="alert">
              Reservation details changed. Go back and review the updated record.
            </p>
          )}
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={backToForm}
          >
            Back
          </button>
          <button
            type="button"
            className={review.kind === "reject" ? "danger-button" : undefined}
            disabled={
              busy ||
              !canAct ||
              Boolean(reviewChanged) ||
              (review.kind === "confirm" && !canConfirm)
            }
            onClick={submitReview}
          >
            {busy ? "Saving…" : actionTitles[review.kind]}
          </button>
        </div>
      )}
    </section>
  );
}
