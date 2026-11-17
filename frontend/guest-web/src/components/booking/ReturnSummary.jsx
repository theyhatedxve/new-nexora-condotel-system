import RentalDetails from "../RentalDetails.jsx";
import { Link } from "react-router";
import { formatPesos } from "../../utils/formatMoney.js";
import usePaymentReturnSummary from "../../hooks/usePaymentReturnSummary.js";

export function ReturnSummary({ booking, onRefresh }) {
  const { state, summary, message, title } = usePaymentReturnSummary({ booking });

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
            <RentalDetails value={booking} />
            <div><dt>Booked stay total</dt><dd>{formatPesos(booking.totalAmountCentavos)}</dd></div>
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

          <p className="checkout-note" role="status">
            {message}
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
