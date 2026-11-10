import { Link } from "react-router";
import { formatPesos } from "../utils/formatters";
import usePropertyCollectionForm from "../hooks/usePropertyCollectionForm.js";

export default function PropertyCollection({ reservationId, record, payment, onReload }) {
  const {
    amount,
    received,
    retryAcknowledged,
    error,
    panelHeading,
    booking,
    summary,
    eligible,
    change,
    state,
    prepare,
    acknowledge,
    confirming,
    pending,
    checking,
    result,
    recovery,
    changeAmount,
    changeReceived,
    handleKeyDown,
    confirmAction,
    checkOriginalAction,
    changeRetryAcknowledged,
    prepareRetryAction,
  } = usePropertyCollectionForm({ reservationId, record, payment, onReload });

  return (
    <section
      className="record-section room-management"
      aria-labelledby="property-collection-title"
    >
      <h2 id="property-collection-title">Record Pay at Property collection</h2>

      <p>
        Record payment already received from the guest. This action does not charge an
        online payment method.
      </p>

      <p>
        Remaining backend balance:{" "}
        <strong>
          {summary && !summary.requiresReview
            ? formatPesos(summary.balanceDueCentavos)
            : "Unavailable"}
        </strong>
      </p>

      {!eligible && change.ready && state.status === "idle" && (
        <p role="status">
          New collection is unavailable for this booking’s current stay or payment state.
          Resolve any pending attempts or financial review first.
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={state.status !== "idle" || !change.ready || !eligible}
        >
          <legend>Payment received</legend>

          <label htmlFor="property-collection-amount">Amount received in PHP</label>
          <input
            id="property-collection-amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            maxLength={11}
            required
            value={amount}
            onChange={changeAmount}
          />

          <label className="action-checkbox">
            <input type="checkbox" checked={received} onChange={changeReceived} />
            <span>I confirm that this payment has actually been received.</span>
          </label>

          <button type="submit" disabled={!received}>
            Review collection
          </button>
        </fieldset>
      </form>

      {state.status === "loading" && <p role="status">Checking collection recovery…</p>}

      {state.status !== "idle" && state.status !== "loading" && (
        <section
          className="action-review"
          aria-labelledby="collection-review-title"
          onKeyDown={handleKeyDown}
        >
          <h3 id="collection-review-title" ref={panelHeading} tabIndex={-1}>
            {confirming
              ? state.retry
                ? "Review original collection retry"
                : "Review collection"
              : "Collection result and recovery"}
          </h3>

          {state.intent && (
            <>
              <p>
                Original collection amount:{" "}
                <strong>{formatPesos(state.intent.amountCentavos)}</strong>
              </p>

              <p>Request reference: {state.intent.requestId}</p>
            </>
          )}

          {confirming && (
            <>
              <p>Booking: {booking?.reservationNumber}</p>

              <p>
                {state.retry
                  ? "This retries the original recording " +
                    "with the same amount and request " +
                    "reference. No additional money " +
                    "should be collected."
                  : "Confirm only after checking the " +
                    "booking, amount, and payment received."}
              </p>

              {!change.confirmationCurrent && (
                <p role="alert">
                  The booking or payment records changed. Go back and review again.
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
                  {state.retry ? "Retry original recording" : "Confirm collection"}
                </button>
              </div>
            </>
          )}

          {(pending || checking) && (
            <p role="status">
              {pending
                ? "Recording the collection. Do not " + "submit it again."
                : "Checking the original receipt…"}
            </p>
          )}

          {state.message && <p role="status">{state.message}</p>}

          {state.status === "recorded" && (
            <p>
              <Link to={"/payments/" + encodeURIComponent(state.receipt.id)}>
                View original collection record
              </Link>
            </p>
          )}

          {result && (
            <>
              <p>
                Review the refreshed payment summary above before acknowledging this
                result.
              </p>

              <button
                type="button"
                onClick={change.reloadForReview}
                disabled={!change.ready}
              >
                Reload booking records
              </button>

              <button type="button" disabled={!change.freshReview} onClick={acknowledge}>
                I reviewed the current records
              </button>
            </>
          )}

          {recovery && (
            <button type="button" onClick={checkOriginalAction}>
              Check original receipt
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
                  I am retrying the same collection recording. No additional payment has
                  been received for this retry.
                </span>
              </label>

              <button
                type="button"
                disabled={!retryAcknowledged || record.status !== "ready"}
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
