import { Link } from "react-router";
import { formatPesos } from "../../utils/formatMoney.js";
import usePaymentReturnSummary from "../../hooks/usePaymentReturnSummary.js";

export function ReturnSummary({ booking, onRefresh }) {
  const { state, summary, paid, closed, title } = usePaymentReturnSummary({ booking });

  return (
    <>
      <h1 aria-live="polite">{title}</h1>

      <p>
        Booking reference: <strong>{booking.reservationNumber}</strong>
      </p>

      {state.status === "error" && (
        <p className="checkout-error" role="alert">
          Payment records could not be verified for this booking. Contact the property
          before paying again.
        </p>
      )}

      {summary && (
        <>
          <dl className="checkout-summary">
            <div>
              <dt>Reservation status</dt>
              <dd>{summary.reservationStatus.replaceAll("_", " ")}</dd>
            </div>

            <div>
              <dt>Payment status</dt>
              <dd>{summary.status.replaceAll("_", " ")}</dd>
            </div>

            <div>
              <dt>Net recorded payment</dt>
              <dd>{formatPesos(summary.netPaidCentavos)}</dd>
            </div>
          </dl>

          <p className="checkout-note">
            {summary.requiresReview
              ? "Contact the property before making another payment."
              : paid
                ? "Full payment is recorded by the backend. Reception still completes check-in."
                : closed
                  ? "This booking is closed. A payment or redirect cannot revive it."
                  : "Full payment has not been verified. Check again before attempting another payment."}
          </p>
        </>
      )}

      <p>
        <button
          className="checkout-button"
          type="button"
          disabled={state.status === "loading"}
          onClick={onRefresh}
        >
          Check payment status
        </button>
      </p>

      <Link
        className="checkout-link"
        to="/my-bookings"
      >
        View My Bookings
      </Link>
    </>
  );
}
