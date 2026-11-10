import { Link } from "react-router";
import { formatPesos } from "../utils/formatMoney.js";
import useGuestBookingReceipt from "../hooks/useGuestBookingReceipt.js";
import { displayTime } from "../utils/receiptDisplayTime.js";

export default function GuestBookingReceipt({ flow }) {
  const {
    heading,
    receipt,
    attempt,
    payment,
    summary,
    busy,
    error,
    online,
    closed,
    paid,
    deadlineReached,
    accessExpired,
    title,
    canStartAnother,
    startAnother,
  } = useGuestBookingReceipt({ flow });

  return (
    <main className="checkout-page checkout-view guest-checkout">
      <section
        className="checkout-panel checkout-receipt"
        aria-labelledby="guest-booking-result"
        aria-busy={busy}
      >
        <p className="checkout-kicker">
          {online ? "PAYMONGO TEST CHECKOUT" : "PAY AT PROPERTY"}
        </p>

        <h1 id="guest-booking-result" ref={heading} tabIndex={-1}>
          {title}
        </h1>

        <p className="checkout-view__receipt-intro">
          {closed
            ? "This request is no longer an active reservation. Payment history and review requirements remain separate."
            : receipt.status === "CONFIRMED"
              ? "The backend has confirmed this reservation. Reception still completes check-in."
              : online
                ? "Your room is temporarily held. Only a verified payment received while the hold is valid can confirm the reservation."
                : "Staff must contact you and record your agreement before confirming this reservation."}
        </p>

        <div className="checkout-view__reference">
          <span>Booking reference</span>
          <strong>{receipt.reservationNumber}</strong>
        </div>

        <dl className="checkout-summary">
          <div>
            <dt>Reservation status</dt>
            <dd>{receipt.status.replaceAll("_", " ")}</dd>
          </div>

          <div>
            <dt>Payment status</dt>
            <dd>{summary ? summary.status.replaceAll("_", " ") : "Not checked"}</dd>
          </div>

          <div>
            <dt>Check-in</dt>
            <dd>{attempt.selection.checkIn}</dd>
          </div>

          <div>
            <dt>Check-out</dt>
            <dd>{attempt.selection.checkOut}</dd>
          </div>

          <div>
            <dt>Guests</dt>
            <dd>{attempt.selection.guests}</dd>
          </div>

          <div>
            <dt>Expected arrival · Philippine time</dt>
            <dd>{displayTime(receipt.expectedArrivalAt)}</dd>
          </div>

          {receipt.status === "PENDING" && (
            <div>
              <dt>{online ? "Online hold deadline" : "Current confirmation deadline"}</dt>
              <dd>{displayTime(receipt.holdExpiresAt)}</dd>
            </div>
          )}

          {!online && receipt.status === "PENDING" && (
            <div>
              <dt>First staff contact</dt>
              <dd>{displayTime(receipt.firstContactedAt)}</dd>
            </div>
          )}

          <div>
            <dt>Booked nightly rate</dt>
            <dd>{formatPesos(receipt.nightlyRateCentavos)}</dd>
          </div>

          <div className="checkout-total">
            <dt>Booked stay total</dt>
            <dd>{formatPesos(receipt.totalAmountCentavos)}</dd>
          </div>
        </dl>

        {!online && receipt.status === "PENDING" && (
          <p className="checkout-note">
            Reply within 24 hours of the first staff contact. The earlier deadline
            applies: that response deadline or 30 minutes after your expected arrival.
            This request remains pending until staff confirms it.
          </p>
        )}

        {deadlineReached && (
          <p role="status" className="guest-checkout__notice">
            The displayed deadline has been reached. Check the latest booking status.
          </p>
        )}

        {paid && (
          <p role="status" className="guest-checkout__notice">
            Full payment is recorded in the verified backend records.
          </p>
        )}

        {busy && (
          <p role="status">
            Checking the original booking and payment attempt. Please wait.
          </p>
        )}

        {error && (
          <p role="alert" className="checkout-error">
            {error}
          </p>
        )}

        {online &&
          payment?.state === "READY" &&
          !busy &&
          !deadlineReached &&
          !accessExpired &&
          !closed && (
            <a
              className="checkout-view__primary-link"
              href={payment.checkoutUrl}
              rel="noreferrer noopener"
            >
              Continue to PayMongo test checkout
            </a>
          )}

        {online && ["CREATING", "UNKNOWN"].includes(payment?.state) && (
          <p className="checkout-note">
            The existing payment attempt is unresolved. Check it again or contact the
            property. Do not start another payment.
          </p>
        )}

        {payment?.state === "REVIEW_REQUIRED" && (
          <p role="status" className="checkout-note">
            This booking or payment needs property review. Contact the property before
            paying again.
          </p>
        )}

        {accessExpired && (
          <p className="checkout-note">
            This private session has expired. Recovery may also have expired. Use the
            email access flow if needed.
          </p>
        )}

        <div className="checkout-view__receipt-actions">
          <button
            className="checkout-view__refresh"
            type="button"
            disabled={busy}
            onClick={flow.resume}
          >
            Check original booking and payment
          </button>

          <Link
            className="checkout-view__secondary-link"
            to={"/my-booking?booking=" + encodeURIComponent(receipt.reservationNumber)}
          >
            View my booking
          </Link>

          <Link className="checkout-view__secondary-link" to="/booking-access">
            Request private email access
          </Link>

          {canStartAnother && (
            <button
              className="checkout-view__refresh"
              type="button"
              disabled={busy}
              onClick={startAnother}
            >
              Start another stay
            </button>
          )}
        </div>

        <p className="checkout-note">
          Save your booking reference. Starting another stay does not cancel this
          reservation. Returning from PayMongo does not itself confirm payment.
        </p>
      </section>
    </main>
  );
}
