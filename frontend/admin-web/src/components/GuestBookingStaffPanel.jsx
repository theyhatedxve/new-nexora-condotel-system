import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useAuth } from "../auth/useAuth";

import {
  confirmGuestBooking,
  hasGuestBookingPolicyFields,
  isPropertyBookingRequest,
  recordGuestContact,
  rejectGuestBooking,
} from "../services/guestBookingStaffApi";

import {
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

const staffRoles = ["ADMIN", "MANAGER", "RECEPTIONIST"];

const actionTitles = {
  contact: "Record guest contact",
  confirm: "Confirm guest agreement",
  reject: "Reject booking request",
};

function failureMessage(error) {
  const status = error.response?.status;

  if (status === 401) {
    return "Your staff session ended. Sign in again before continuing.";
  }
  if (status === 403) {
    return "Your current account cannot perform this action.";
  }
  if (status === 404) {
    return "The reservation is unavailable. Refresh the reservation list.";
  }
  if (status === 409) {
    return "The request cannot proceed in its current state. Details have been refreshed; check its status, deadlines, and payment records.";
  }
  if (status === 400) {
    return "The action was rejected. Refresh the booking and check the required information.";
  }
  if (status === 429) {
    return "Too many requests. Wait before checking the updated booking.";
  }
  return "The result could not be confirmed. Details have been refreshed. Check the booking before repeating any action.";
}

export default function GuestBookingStaffPanel({ record, payment, onReload }) {
  const { status: authStatus, user } = useAuth();
  const prefix = useId();

  const [channel, setChannel] = useState("");
  const [guestAgreed, setGuestAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const submitting = useRef(false);
  const trigger = useRef(null);
  const reviewHeading = useRef(null);
  const message = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);

  useEffect(() => {
    if (outcome && record.status === "ready") {
      message.current?.focus();
    }
  }, [outcome, record.status]);

  if (
    authStatus !== "authenticated" ||
    !staffRoles.includes(user?.role) ||
    record.status !== "ready"
  ) {
    return null;
  }

  const booking = record.data;

  if (!hasGuestBookingPolicyFields(booking)) {
    return (
      <section className="content-card record-section">
        <h2>Guest request confirmation</h2>
        <p role="alert">
          Booking policy details are unavailable.
          Refresh details before using staff confirmation.
        </p>
      </section>
    );
  }

  if (!isPropertyBookingRequest(booking)) return null;

  const summary = payment.data;
  const financialStateReady =
    payment.status === "ready" &&
    summary?.reservationNumber === booking.reservationNumber &&
    summary.reservationStatus === booking.status &&
    summary.status === "UNPAID" &&
    summary.requiresReview === false &&
    summary.hasPendingPayment === false &&
    summary.collectedCentavos === 0 &&
    summary.refundedCentavos === 0;

  const deadline = Date.parse(booking.holdExpiresAt);
  const timingReady =
    Number.isFinite(Date.parse(booking.expectedArrivalAt)) &&
    Number.isFinite(deadline);
  const overdue = timingReady && deadline <= now;
  const pending = booking.status === "PENDING";
  const awaitingRefresh = outcome?.baseline === booking;
  const canAct =
    pending && timingReady && !overdue && financialStateReady &&
    !busy && !awaitingRefresh;
  const canConfirm =
    canAct && Boolean(booking.firstContactedAt) &&
    Boolean(booking.responseDeadlineAt);
  const reviewChanged = review && review.baseline !== booking;

  function beginReview(kind, event) {
    setFormError("");
    if (!canAct) return;

    if (kind === "contact" && !channel) {
      setFormError("Choose phone or email contact.");
      return;
    }
    if (kind === "confirm" && (!canConfirm || !guestAgreed)) {
      setFormError(
        "Record contact and explicitly acknowledge the guest’s agreement.",
      );
      return;
    }
    const cleanedReason = reason.trim();
    if (
      kind === "reject" &&
      (cleanedReason.length < 3 || cleanedReason.length > 500)
    ) {
      setFormError("Enter a rejection reason of 3–500 characters.");
      return;
    }

    trigger.current = event.currentTarget;
    setReview({
      kind, baseline: booking, channel, guestAgreed, reason: cleanedReason,
    });
  }

  function backToForm() {
    setReview(null);
    trigger.current?.focus();
  }

  async function submitReview() {
    if (
      submitting.current || !review || reviewChanged || !canAct ||
      (review.kind === "confirm" && !canConfirm)
    ) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setFormError("");
    const command = review;
    let result;

    try {
      if (command.kind === "contact") {
        await recordGuestContact(booking, command.channel);
        result = {
          success: true,
          text: "Guest contact recorded. Check the refreshed deadlines.",
        };
      } else if (command.kind === "confirm") {
        await confirmGuestBooking(booking, command.guestAgreed);
        result = {
          success: true,
          text: "Guest agreement recorded and reservation confirmed. No payment was recorded.",
        };
      } else {
        await rejectGuestBooking(booking, command.reason);
        result = {
          success: true,
          text: "Booking request rejected. Check the refreshed reservation status.",
        };
      }
    } catch (error) {
      result = { success: false, text: failureMessage(error) };
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }

    if (!mounted.current) return;
    setOutcome({ ...result, baseline: booking });
    setReview(null);
    setGuestAgreed(false);
    setReason("");
    setChannel("");
    onReload();
  }

  return (
    <section
      className="content-card record-section reservation-actions"
      aria-labelledby={`${prefix}-heading`}
      aria-busy={busy}
    >
      <h2 id={`${prefix}-heading`}>Pay at Property request</h2>
      <p>
        Record contact already made by phone or email. Confirmation requires
        the guest’s explicit agreement and does not record a payment.
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
          <dd>{booking.firstContactedAt
            ? formatTimestamp(booking.firstContactedAt) : "Not recorded"}</dd>
        </div>
        <div>
          <dt>Guest response deadline · Philippine time</dt>
          <dd>{booking.responseDeadlineAt
            ? formatTimestamp(booking.responseDeadlineAt)
            : "Starts after first contact"}</dd>
        </div>
        <div>
          <dt>Current confirmation deadline · Philippine time</dt>
          <dd>{booking.holdExpiresAt
            ? formatTimestamp(booking.holdExpiresAt) : "Not applicable"}</dd>
        </div>
        <div>
          <dt>Confirmed at · Philippine time</dt>
          <dd>{formatTimestamp(booking.confirmedAt)}</dd>
        </div>
      </dl>

      <p>
        First contact starts a 24-hour response window. Repeated contact does
        not extend it. The earlier deadline applies: the response deadline or
        30 minutes after expected arrival.
      </p>

      {outcome && (
        <p ref={message} tabIndex={-1}
          role={outcome.success ? "status" : "alert"}
          className="action-review">
          {outcome.text}
        </p>
      )}
      {pending && !timingReady && (
        <p role="alert">
          Booking timing requires review. Staff actions are unavailable.
        </p>
      )}
      {pending && overdue && (
        <p role="alert">
          The confirmation deadline has passed. Refresh details to check
          the processed reservation status.
        </p>
      )}
      {pending && !financialStateReady && (
        <p role="status">
          Staff confirmation requires current unpaid payment records without
          a pending attempt or financial review. Check the payment summary
          and refresh details.
        </p>
      )}
      {!pending && (
        <p>
          This request is {formatStatus(booking.status).toLowerCase()}.
          Pending-request actions are unavailable.
        </p>
      )}
      {formError && <p role="alert">{formError}</p>}

      {pending && !review && (
        <>
          <fieldset className="action-fields" disabled={!canAct}>
            <legend>Record completed contact</legend>
            <label htmlFor={`${prefix}-channel`}>Contact channel</label>
            <select id={`${prefix}-channel`} value={channel}
              onChange={(event) => setChannel(event.target.value)}>
              <option value="">Choose a channel</option>
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
            </select>
            <p>This records contact; it does not place a call or send an email.</p>
            <button type="button"
              onClick={(event) => beginReview("contact", event)}>
              Review contact
            </button>
          </fieldset>

          <fieldset className="action-fields" disabled={!canConfirm}>
            <legend>Confirm guest agreement</legend>
            <label className="action-checkbox">
              <input type="checkbox" checked={guestAgreed}
                onChange={(event) => setGuestAgreed(event.target.checked)} />
              <span>
                I contacted the guest and they explicitly agreed
                to keep this reservation.
              </span>
            </label>
            <button type="button"
              onClick={(event) => beginReview("confirm", event)}>
              Review confirmation
            </button>
          </fieldset>

          <fieldset className="action-fields" disabled={!canAct}>
            <legend>Reject request</legend>
            <label htmlFor={`${prefix}-reason`}>Rejection reason</label>
            <textarea id={`${prefix}-reason`} value={reason}
              maxLength={500} rows={3}
              onChange={(event) => setReason(event.target.value)} />
            <p>Enter 3–500 characters. Avoid unnecessary private information.</p>
            <button type="button" className="danger-button"
              onClick={(event) => beginReview("reject", event)}>
              Review rejection
            </button>
          </fieldset>
        </>
      )}

      {review && (
        <div className="action-confirmation">
          <h3 ref={reviewHeading} tabIndex={-1}>{actionTitles[review.kind]}</h3>
          <p>Booking: <strong>{booking.reservationNumber}</strong></p>
          {review.kind === "contact" && (
            <p>
              Record completed contact by <strong>{review.channel.toLowerCase()}</strong>.
              Existing first-contact deadlines will not be extended.
            </p>
          )}
          {review.kind === "confirm" && (
            <p>
              Confirm that the guest explicitly agreed to this stay.
              The backend will recheck deadlines and inventory.
              No payment or check-in is recorded.
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
          <button type="button" className="secondary-button"
            disabled={busy} onClick={backToForm}>
            Back
          </button>
          <button type="button"
            className={review.kind === "reject" ? "danger-button" : undefined}
            disabled={busy || !canAct || Boolean(reviewChanged) ||
              (review.kind === "confirm" && !canConfirm)}
            onClick={submitReview}>
            {busy ? "Saving…" : actionTitles[review.kind]}
          </button>
        </div>
      )}
    </section>
  );
}
