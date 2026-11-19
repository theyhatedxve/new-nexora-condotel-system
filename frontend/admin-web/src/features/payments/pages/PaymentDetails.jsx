import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  RefreshCw,
  Wallet,
} from "lucide-react";

import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import PaymentRefund from "../components/PaymentRefund.jsx";
import usePaymentDetailsPage from "../hooks/usePaymentDetailsPage.js";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../../../shared/utils/formatters.js";

import "../styles/payment-workspace.css";

export default function PaymentDetails() {
  const {
    paymentId,
    returnSearch,
    state,
    canManageRefunds,
    payment,
    receiptFields,
    summary,
    bookingFields,
  } = usePaymentDetailsPage();

  return (
    <section
      className="payment-details-screen payment-ui"
      aria-labelledby="payment-title"
    >
      <header className="payment-ui__toolbar">
        <Link
          className="payment-ui__back"
          to={{
            pathname: "/payments",
            search: returnSearch ? "?" + returnSearch : "",
          }}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Return to payments
        </Link>

        <button
          type="button"
          className="payment-ui__secondary"
          onClick={state.reload}
          disabled={state.loading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {state.loading ? "Refreshing…" : "Refresh payment"}
        </button>
      </header>

      <h1 id="payment-title" className="payment-ui__sr-only">
        Payment details
      </h1>

      <StaffDataState state={state} label="Payment details" />

      {payment && (
        <>
          <section
            className="payment-ui__identity"
            aria-labelledby="payment-identity-title"
          >
            <span className="payment-ui__identity-icon">
              <Wallet size={29} aria-hidden="true" />
            </span>

            <div className="payment-ui__identity-text">
              <p className="payment-ui__eyebrow">Payment record</p>
              <h2 id="payment-identity-title">{payment.id}</h2>

              <p className="payment-ui__status-line">
                Stored status
                <span
                  className="payment-ui__badge"
                  data-status={payment.status}
                >
                  {formatStatus(payment.status)}
                </span>
              </p>
            </div>

            <Link
              className="payment-ui__primary"
              to={
                "/reservations/" +
                encodeURIComponent(payment.reservation.id)
              }
            >
              Open Reservation
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>

          <nav
            className="payment-ui__section-nav"
            aria-label="Payment details sections"
          >
            <a href="#payment-record">Payment Record</a>
            <a href="#individual-receipt">Individual Receipt</a>
            <a href="#booking-payment-summary">Booking Summary</a>

            {canManageRefunds &&
              payment.method === "PAY_AT_PROPERTY" && (
                <a href="#payment-refunds">Property Refund</a>
              )}
          </nav>

          <section
            id="payment-record"
            className="payment-ui__card"
            aria-labelledby="payment-record-title"
            tabIndex={-1}
          >
            <h2 id="payment-record-title">
              <CreditCard size={21} aria-hidden="true" />
              Payment Record
            </h2>

            <dl className="record-fields payment-ui__record-fields">
              <div>
                <dt>Booking reference</dt>
                <dd>
                  <Link
                    to={
                      "/reservations/" +
                      encodeURIComponent(payment.reservation.id)
                    }
                  >
                    {payment.reservation.reservationNumber}
                  </Link>
                </dd>
              </div>

              <div>
                <dt>Reservation status</dt>
                <dd>{formatStatus(payment.reservation.status)}</dd>
              </div>

              <div>
                <dt>Payment method</dt>
                <dd>{formatStatus(payment.method)}</dd>
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
                <dd>
                  <span
                    className="payment-ui__badge"
                    data-verification={payment.verification}
                  >
                    {formatStatus(payment.verification)}
                  </span>
                </dd>
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
          </section>

          <div className="payment-ui__financial-grid">
            <section
              id="individual-receipt"
              className="record-section"
              aria-labelledby="receipt-title"
              tabIndex={-1}
            >
              <h2 id="receipt-title">Individual Receipt Figures</h2>

              {payment.requiresReview ? (
                <p role="status" className="payment-ui__notice">
                  This payment requires financial review. Receipt figures
                  are withheld until its records can be safely accepted.
                </p>
              ) : (
                <>
                  <p className="payment-ui__muted">
                    These figures apply only to this payment record.
                  </p>

                  {payment.verification === "NOT_COLLECTED" && (
                    <p role="status" className="payment-ui__notice">
                      This record has no accepted collection.
                    </p>
                  )}

                  <dl className="record-fields payment-ui__totals">
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
              id="booking-payment-summary"
              className="record-section"
              aria-labelledby="booking-finances-title"
              tabIndex={-1}
            >
              <h2 id="booking-finances-title">
                Booking Payment Summary
              </h2>

              <p className="payment-ui__muted">
                Combined figures for all payment records associated
                with this reservation.
              </p>

              {payment.bookingRequiresReview && (
                <p role="status" className="payment-ui__notice">
                  The booking requires financial review. Resolve the
                  review before taking financial or stay actions.
                </p>
              )}

              {summary ? (
                <>
                  <div className="payment-ui__summary-state">
                    <span>Payment state</span>
                    <span
                      className="payment-ui__badge"
                      data-status={summary.status}
                    >
                      {formatStatus(summary.status)}
                    </span>
                  </div>

                  <p className="payment-ui__muted">
                    Pending payment attempt:{" "}
                    {summary.hasPendingPayment ? "Yes" : "No"}
                  </p>

                  <dl className="record-fields payment-ui__totals">
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
                  Booking figures are unavailable until the payment
                  records are reviewed.
                </p>
              )}
            </section>
          </div>
        </>
      )}

      {canManageRefunds && (
        <div
          id="payment-refunds"
          className="payment-ui__section"
          tabIndex={-1}
        >
          <PaymentRefund
            key={"cash-refund-" + paymentId}
            paymentId={paymentId}
            record={state}
          />
        </div>
      )}
    </section>
  );
}