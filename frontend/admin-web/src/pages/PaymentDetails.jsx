import { Link, useParams } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import { getPayment } from "../services/paymentsApi";
import StaffDataState from "../components/StaffDataState";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

export default function PaymentDetails() {
  const { paymentId } = useParams();
  const state = useStaffData(getPayment, paymentId);

  const payment =
    state.status === "ready" ? state.data : null;

  const receiptFields = payment?.collection
    ? [
        [
          "Verified collection",
          payment.collection.collectedCentavos,
        ],
        [
          "Completed refunds",
          payment.collection.refundedCentavos,
        ],
        [
          "Pending refunds",
          payment.collection.pendingRefundCentavos,
        ],
        [
          "Net collection",
          payment.collection.netPaidCentavos,
        ],
      ]
    : [];

  const summary = payment?.bookingSummary;

  const bookingFields = summary
    ? [
        ["Booked total", summary.bookedTotalCentavos],
        ["Total collected", summary.collectedCentavos],
        ["Completed refunds", summary.refundedCentavos],
        ["Pending refunds", summary.pendingRefundCentavos],
        ["Net paid", summary.netPaidCentavos],
        ["Balance due", summary.balanceDueCentavos],
        ["Overpayment", summary.overpaidCentavos],
      ]
    : [];

  return (
    <section aria-labelledby="payment-title">
      <Link to="/payments">Return to payments</Link>

      <div className="records-heading">
        <h1 id="payment-title">Payment details</h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh payment
        </button>
      </div>

      <StaffDataState
        state={state}
        label="Payment details"
      />

      {payment && (
        <>
          <dl className="record-fields">
            <div>
              <dt>Payment record</dt>
              <dd>{payment.id}</dd>
            </div>

            <div>
              <dt>Booking reference</dt>
              <dd>
                <Link
                  to={
                    "/reservations/" +
                    encodeURIComponent(
                      payment.reservation.id,
                    )
                  }
                >
                  {payment.reservation.reservationNumber}
                </Link>
              </dd>
            </div>

            <div>
              <dt>Reservation status</dt>
              <dd>
                {formatStatus(payment.reservation.status)}
              </dd>
            </div>

            <div>
              <dt>Payment method</dt>
              <dd>{formatStatus(payment.method)}</dd>
            </div>

            <div>
              <dt>Stored payment status</dt>
              <dd>{formatStatus(payment.status)}</dd>
            </div>

            <div>
              <dt>Stored amount</dt>
              <dd>
                {payment.currency === "PHP"
                  ? formatPesos(payment.amountCentavos)
                  : "Requires review"}
              </dd>
            </div>

            <div>
              <dt>Currency</dt>
              <dd>{payment.currency}</dd>
            </div>

            <div>
              <dt>Collection verification</dt>
              <dd>{formatStatus(payment.verification)}</dd>
            </div>

            <div>
              <dt>Recorded payment time</dt>
              <dd>{formatTimestamp(payment.paidAt)}</dd>
            </div>

            <div>
              <dt>Created</dt>
              <dd>{formatTimestamp(payment.createdAt)}</dd>
            </div>

            <div>
              <dt>Last updated</dt>
              <dd>{formatTimestamp(payment.updatedAt)}</dd>
            </div>
          </dl>

          <section
            className="record-section"
            aria-labelledby="receipt-title"
          >
            <h2 id="receipt-title">
              Individual receipt figures
            </h2>

            {payment.requiresReview ? (
              <p role="status">
                This payment requires financial review.
                Receipt figures are withheld until its
                records can be safely accepted.
              </p>
            ) : (
              <>
                <p>
                  These figures apply only to this payment
                  record.
                </p>

                {payment.verification === "NOT_COLLECTED" && (
                  <p role="status">
                    This record has no accepted collection.
                  </p>
                )}

                <dl className="record-fields">
                  {receiptFields.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{formatPesos(value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </section>

          <section
            className="record-section"
            aria-labelledby="booking-finances-title"
          >
            <h2 id="booking-finances-title">
              Booking payment summary
            </h2>

            <p>
              This summary combines all payment records
              for the related reservation.
            </p>

            {payment.bookingRequiresReview && (
              <p role="status">
                The booking requires financial review.
                Resolve the review before taking financial
                or stay actions.
              </p>
            )}

            {summary ? (
              <>
                <p>
                  Payment state:{" "}
                  {formatStatus(summary.status)}
                </p>

                <p>
                  Pending payment attempt:{" "}
                  {summary.hasPendingPayment ? "Yes" : "No"}
                </p>

                <dl className="record-fields">
                  {bookingFields.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{formatPesos(value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p>
                Booking figures are unavailable until
                the payment records are reviewed.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}