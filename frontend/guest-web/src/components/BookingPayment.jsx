import { formatPesos } from "../utils/formatMoney.js";
import useBookingPayment from "../hooks/useBookingPayment.js";

export default function BookingPayment({ booking }) {
  const { state, createCheckout, refresh, summary, checkout, deadlineReached, paid } =
    useBookingPayment({ booking });

  return (
    <section
      className="my-booking__card my-booking__payment"
      aria-labelledby="booking-payment-heading"
    >
      <h2 id="booking-payment-heading">Payment</h2>

      {state.busy && <p role="status">Checking verified backend records...</p>}

      {state.error && (
        <p className="checkout-error" role="alert">
          {state.error}
        </p>
      )}

      {summary && (
        <>
          <dl className="checkout-summary">
            <div>
              <dt>Payment status</dt>
              <dd>{summary.status.replaceAll("_", " ")}</dd>
            </div>

            <div>
              <dt>Net recorded payment</dt>
              <dd>{formatPesos(summary.netPaidCentavos)}</dd>
            </div>

            <div>
              <dt>Balance due</dt>
              <dd>
                {summary.balanceDueCentavos === null
                  ? "Not applicable to this closed stay"
                  : formatPesos(summary.balanceDueCentavos)}
              </dd>
            </div>
          </dl>

          {summary.reservationStatus !== booking.status && (
            <p className="checkout-note">
              The reservation status has changed. Refresh booking details to see its
              latest state.
            </p>
          )}

          {paid && (
            <p role="status">Full payment is recorded in the verified backend records.</p>
          )}

          {summary.requiresReview && (
            <p role="status" className="checkout-note">
              This payment needs property review. Contact the property before paying
              again.
            </p>
          )}
        </>
      )}

      {deadlineReached && (
        <p role="status" className="checkout-note">
          The pending hold deadline has been reached. Refresh booking details before
          continuing.
        </p>
      )}

      {!state.busy &&
        !deadlineReached &&
        checkout?.state === "NONE" &&
        checkout.amountCentavos > 0 && (
          <p>
            <button className="checkout-button" type="button" onClick={createCheckout}>
              Prepare PayMongo test checkout
            </button>
          </p>
        )}

      {!state.busy && !deadlineReached && checkout?.state === "READY" && (
        <p>
          <a
            className="checkout-link"
            href={checkout.checkoutUrl}
            rel="noreferrer noopener"
          >
            Continue to PayMongo test checkout
          </a>
        </p>
      )}

      {["CREATING", "UNKNOWN"].includes(checkout?.state) && (
        <p role="status" className="checkout-note">
          The existing payment attempt is unresolved. Check it again or contact the
          property. Do not create a replacement payment.
        </p>
      )}

      <p>
        <button
          className="checkout-button"
          type="button"
          disabled={state.busy}
          onClick={refresh}
        >
          Check payment records
        </button>
      </p>

      <p className="checkout-note">
        Online checkout is test mode. Reservation status and payment status are separate.
        Returning from PayMongo does not itself establish payment.
      </p>
    </section>
  );
}
