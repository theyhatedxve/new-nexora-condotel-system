import { Link } from "react-router";
import { ArrowRight, RefreshCw } from "lucide-react";

import RentalDetails from "../RentalDetails.jsx";
import { formatPesos } from "../../utils/formatMoney.js";
import usePaymentReturnSummary from "../../hooks/usePaymentReturnSummary.js";

export function ReturnSummary({ booking, onRefresh }) {
  const { state, summary, message, title } =
    usePaymentReturnSummary({ booking });

  return (
    <>
      <h1 id="payment-return-title" aria-live="polite">
        {title}
      </h1>

      <div className="payment-return__reference">
        <span>Booking reference</span>
        <strong>{booking.reservationNumber}</strong>
      </div>

      {state.status === "loading" && (
        <p
          className="payment-return__message"
          role="status"
        >
          Checking verified payment records. Please wait.
        </p>
      )}

      {state.status === "error" && (
        <p className="payment-return__error" role="alert">
          Payment records could not be verified for this booking.
          Contact the property before paying again.
        </p>
      )}

      {summary && (
        <>
          <dl className="payment-return__statuses">
            <div>
              <dt>Reservation status</dt>
              <dd>
                {summary.reservationStatus.replaceAll("_", " ")}
              </dd>
            </div>

            <div>
              <dt>Payment status</dt>
              <dd>{summary.status.replaceAll("_", " ")}</dd>
            </div>
          </dl>

          <dl className="checkout-summary">
            <RentalDetails value={booking} />

            <div>
              <dt>Booked stay total</dt>
              <dd>
                {formatPesos(booking.totalAmountCentavos)}
              </dd>
            </div>

            <div>
              <dt>Net recorded payment</dt>
              <dd>{formatPesos(summary.netPaidCentavos)}</dd>
            </div>
          </dl>

          <p className="payment-return__notice" role="status">
            {message}
          </p>
        </>
      )}

      <div className="payment-return__actions">
        <button
          className="payment-return__secondary"
          type="button"
          disabled={state.status === "loading"}
          onClick={onRefresh}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {state.status === "loading"
            ? "Checking…"
            : "Check Payment Status"}
        </button>

        <Link
          className="payment-return__primary"
          to="/my-bookings"
        >
          View My Bookings
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}