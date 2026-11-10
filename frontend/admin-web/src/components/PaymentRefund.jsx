import { CASH_REFUND_REASONS } from "../services/refundsApi";
import { formatPesos, formatTimestamp } from "../utils/formatters";
import usePaymentRefundForm from "../hooks/usePaymentRefundForm.js";

export default function PaymentRefund({ paymentId, record }) {
  const {
    amount,
    reason,
    returned,
    retryAcknowledged,
    error,
    panelHeading,
    payment,
    canRequest,
    change,
    state,
    prepare,
    acknowledge,
    confirming,
    pending,
    checking,
    recovery,
    reasonLabel,
    changeAmount,
    changeReason,
    changeReturned,
    handleKeyDown,
    confirmAction,
    checkOriginalAction,
    changeRetryAcknowledged,
    prepareRetryAction,
  } = usePaymentRefundForm({ paymentId, record });

  if (state.status === "idle" && payment && payment.method !== "PAY_AT_PROPERTY") {
    return null;
  }

  return (
    <section
      className="record-section room-management"
      aria-labelledby="cash-refund-title"
    >
      <h2 id="cash-refund-title">Record Pay at Property refund</h2>

      <p>
        Record money already returned to the guest. This action does not initiate an
        online refund.
      </p>

      {payment?.method === "PAY_AT_PROPERTY" && (
        <>
          <p>
            Original receipt amount:{" "}
            <strong>{formatPesos(payment.amountCentavos)}</strong>
          </p>

          {payment.collection ? (
            <p>
              Receipt net after completed refunds:{" "}
              <strong>{formatPesos(payment.collection.netPaidCentavos)}</strong>
            </p>
          ) : (
            <p>
              Some receipt figures are withheld for review. The backend validates the
              remaining refundable amount and payment evidence.
            </p>
          )}
        </>
      )}

      {!canRequest && change.ready && state.status === "idle" && (
        <p role="status">
          A new refund is unavailable for this payment’s current state. Checked-in and
          pending stays cannot receive a new refund through this workflow.
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={state.status !== "idle" || !change.ready || !canRequest}
        >
          <legend>Returned payment</legend>

          <label htmlFor="cash-refund-amount">Amount returned in PHP</label>
          <input
            id="cash-refund-amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            maxLength={11}
            required
            value={amount}
            onChange={changeAmount}
          />

          <label htmlFor="cash-refund-reason">Refund reason</label>
          <select id="cash-refund-reason" required value={reason} onChange={changeReason}>
            <option value="">Choose a reason</option>

            {CASH_REFUND_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label className="action-checkbox">
            <input type="checkbox" checked={returned} onChange={changeReturned} />
            <span>
              I confirm that this money has actually been returned to the guest.
            </span>
          </label>

          <button type="submit" disabled={!returned}>
            Review refund recording
          </button>
        </fieldset>
      </form>

      {state.status === "loading" && <p role="status">Checking refund recovery…</p>}

      {state.status !== "idle" && state.status !== "loading" && (
        <section
          className="action-review"
          aria-labelledby="cash-refund-review-title"
          onKeyDown={handleKeyDown}
        >
          <h3 id="cash-refund-review-title" ref={panelHeading} tabIndex={-1}>
            {confirming
              ? state.retry
                ? "Review original refund retry"
                : "Review refund recording"
              : "Refund result and recovery"}
          </h3>

          {state.intent && (
            <dl className="record-fields">
              <div>
                <dt>Refund amount</dt>
                <dd>{formatPesos(state.intent.amountCentavos)}</dd>
              </div>

              <div>
                <dt>Reason</dt>
                <dd>{reasonLabel(state.intent.reason)}</dd>
              </div>

              <div>
                <dt>Request reference</dt>
                <dd>{state.intent.requestId}</dd>
              </div>
            </dl>
          )}

          {confirming && (
            <>
              <p>Booking: {payment?.reservation.reservationNumber}</p>

              <p>
                {state.retry
                  ? "This retries the original recording. " +
                    "Keep the same amount and reason. " +
                    "Do not return the money again."
                  : "Confirm the payment record, amount, " +
                    "reason, and money already returned."}
              </p>

              {!change.confirmationCurrent && (
                <p role="alert">
                  Payment records changed or are loading. Go back and review again.
                </p>
              )}

              <div className="actions">
                <button type="button" onClick={change.back}>
                  Back
                </button>

                <button
                  type="button"
                  disabled={!change.confirmationCurrent}
                  onClick={confirmAction}
                >
                  {state.retry ? "Retry original recording" : "Confirm refund recording"}
                </button>
              </div>
            </>
          )}

          {(pending || checking) && (
            <p role="status">
              {pending
                ? "Recording the refund. Do not submit " + "it again."
                : "Checking the original refund…"}
            </p>
          )}

          {state.message && <p role="status">{state.message}</p>}

          {state.status === "completed" && (
            <>
              <dl className="record-fields">
                <div>
                  <dt>Refund record</dt>
                  <dd>{state.refund.id}</dd>
                </div>

                <div>
                  <dt>Completed</dt>
                  <dd>{formatTimestamp(state.refund.completedAt)}</dd>
                </div>
              </dl>

              <p>
                Review the refreshed receipt figures, booking summary, and financial
                warnings above.
              </p>

              <button
                type="button"
                disabled={!change.ready}
                onClick={change.reloadForReview}
              >
                Reload payment records
              </button>

              <button type="button" disabled={!change.freshReview} onClick={acknowledge}>
                I reviewed the current records
              </button>
            </>
          )}

          {recovery && (
            <button type="button" onClick={checkOriginalAction}>
              Check original refund
            </button>
          )}

          {state.status === "absent" && (
            <>
              <label className="action-checkbox">
                <input
                  type="checkbox"
                  checked={retryAcknowledged}
                  onChange={changeRetryAcknowledged}
                />
                <span>
                  This retries the same refund recording. I have not returned additional
                  money for this retry.
                </span>
              </label>

              <button
                type="button"
                disabled={!retryAcknowledged || !change.ready}
                onClick={prepareRetryAction}
              >
                Review original retry
              </button>
            </>
          )}
        </section>
      )}
    </section>
  );
}
