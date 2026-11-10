import { Link } from "react-router";
import { RECONCILIATION_OUTCOMES } from "../services/reconciliationApi";
import { formatPesos, formatStatus } from "../utils/formatters";
import useReconciliationActions from "../hooks/useReconciliationActions.js";

export default function ReconciliationActions({ queue }) {
  const {
    change,
    kind,
    targetId,
    eventId,
    providerReference,
    lateAcknowledged,
    retryAcknowledged,
    error,
    heading,
    state,
    data,
    paymentIds,
    selectedRefund,
    linkedEvents,
    prepare,
    acknowledge,
    confirming,
    recovery,
    details,
    handleChooseKind,
    handleChooseTarget,
    changeEventId,
    changeLateAcknowledged,
    changeProviderReference,
    handleKeyDown,
    confirmAction,
    checkStatusAction,
    changeRetryAcknowledged,
    prepareRetryAction,
  } = useReconciliationActions({ queue });

  return (
    <section
      className="record-section room-management"
      aria-labelledby="reconciliation-actions-title"
    >
      <h2 id="reconciliation-actions-title">Reconcile existing test records</h2>

      <p>
        Check existing payment or refund evidence. Reconciliation can update local
        financial records; it does not create a new charge or refund.
      </p>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={state.status !== "idle" || !change.ready}
        >
          <legend>Reconciliation request</legend>

          <label htmlFor="reconciliation-kind">Operation</label>
          <select id="reconciliation-kind" value={kind} onChange={handleChooseKind}>
            <option value="payment">Payment</option>
            <option value="refund">Existing PayMongo refund</option>
          </select>

          <label htmlFor="reconciliation-target">
            {kind === "payment" ? "Payment record" : "Refund record"}
          </label>
          <select
            id="reconciliation-target"
            required
            value={targetId}
            onChange={handleChooseTarget}
          >
            <option value="">Choose an existing record</option>

            {kind === "payment"
              ? paymentIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))
              : data?.refunds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}
                  </option>
                ))}
          </select>

          {kind === "payment" ? (
            <>
              <label htmlFor="reconciliation-event">Existing paid-event reference</label>
              <input
                id="reconciliation-event"
                list="reconciliation-linked-events"
                required
                maxLength={100}
                pattern="evt_[A-Za-z0-9_]{1,96}"
                value={eventId}
                onChange={changeEventId}
              />

              <datalist id="reconciliation-linked-events">
                {linkedEvents.map((item) => (
                  <option key={item.providerEventId} value={item.providerEventId} />
                ))}
              </datalist>

              <p>
                Use the event reference belonging to this payment. The backend checks its
                authenticity and financial details.
              </p>

              <label className="action-checkbox">
                <input
                  type="checkbox"
                  checked={lateAcknowledged}
                  onChange={changeLateAcknowledged}
                />
                <span>
                  I explicitly acknowledge late-payment handling for this request.
                  Cancelled and expired bookings must remain closed.
                </span>
              </label>
            </>
          ) : (
            <>
              <label htmlFor="reconciliation-provider-refund">
                Existing provider refund reference
              </label>
              <input
                id="reconciliation-provider-refund"
                maxLength={100}
                pattern="ref_[A-Za-z0-9_]{1,96}"
                value={selectedRefund?.providerRefundId || providerReference}
                readOnly={Boolean(selectedRefund?.providerRefundId)}
                onChange={changeProviderReference}
              />

              <p>
                Use an existing provider reference. Leave it empty if unavailable; the
                backend may return Provider reference required.
              </p>
            </>
          )}

          <button type="submit">Review reconciliation</button>
        </fieldset>
      </form>

      {state.status === "loading" && <p role="status">Checking request recovery…</p>}

      {state.status !== "idle" && state.status !== "loading" && (
        <section
          className="action-review"
          aria-labelledby="reconciliation-request-title"
          onKeyDown={handleKeyDown}
        >
          <h3 id="reconciliation-request-title" ref={heading} tabIndex={-1}>
            {confirming
              ? state.retry
                ? "Review original request retry"
                : "Review reconciliation"
              : "Reconciliation result and recovery"}
          </h3>

          {state.intent && (
            <dl className="record-fields">
              <div>
                <dt>Operation</dt>
                <dd>{formatStatus(state.intent.kind)}</dd>
              </div>

              <div>
                <dt>Target record</dt>
                <dd>{state.intent.targetId}</dd>
              </div>

              <div>
                <dt>Request reference</dt>
                <dd>{state.intent.requestId}</dd>
              </div>

              {state.intent.kind === "payment" ? (
                <>
                  <div>
                    <dt>Event reference</dt>
                    <dd>{state.intent.eventId}</dd>
                  </div>

                  <div>
                    <dt>Late-payment acknowledgment</dt>
                    <dd>{state.intent.acknowledgeLateCapture ? "Yes" : "No"}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Provider refund reference</dt>
                  <dd>{state.intent.providerRefundId || "Not supplied"}</dd>
                </div>
              )}
            </dl>
          )}

          {confirming && (
            <>
              <p>
                {state.retry
                  ? "Retry the original request with " +
                    "the same identifier and unchanged inputs."
                  : "Check every reference and acknowledgment " + "before submitting."}
              </p>

              {!change.confirmationCurrent && (
                <p role="alert">
                  Queue records changed or are loading. Go back and review again.
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
                  {state.retry
                    ? "Retry original reconciliation"
                    : "Confirm reconciliation"}
                </button>
              </div>
            </>
          )}

          {["pending", "checking"].includes(state.status) && (
            <p role="status">
              {state.status === "pending"
                ? "Reconciling. Do not submit again."
                : "Reading the original request status…"}
            </p>
          )}

          {state.message && <p role="status">{state.message}</p>}

          {recovery && (
            <button type="button" onClick={checkStatusAction}>
              Check original request status
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
                  I am retrying the original request, using the same references and
                  acknowledgment.
                </span>
              </label>

              <button
                type="button"
                disabled={!retryAcknowledged}
                onClick={prepareRetryAction}
              >
                Review original retry
              </button>
            </>
          )}

          {state.status === "done" && (
            <>
              <p role="status">
                <strong>{formatStatus(state.result.outcome)}</strong>
                {": "}
                {RECONCILIATION_OUTCOMES[state.result.outcome]}
              </p>

              {state.result.alreadyReconciled && (
                <p>The original saved result was returned.</p>
              )}

              <p>
                <Link to={"/payments/" + encodeURIComponent(state.intent.paymentId)}>
                  Open related payment details
                </Link>
              </p>

              {state.details.status === "loading" && (
                <p role="status">Loading current financial records…</p>
              )}

              {state.details.status === "review" && (
                <p role="alert">
                  Current financial records require review. The recorded reconciliation
                  outcome does not establish financial completion.
                </p>
              )}

              {state.details.status === "error" && (
                <p role="alert">
                  Current financial records could not be loaded. Reload them before
                  acknowledging.
                </p>
              )}

              {details && (
                <>
                  <dl className="record-fields">
                    <div>
                      <dt>Current payment status</dt>
                      <dd>{formatStatus(details.payment.status)}</dd>
                    </div>

                    <div>
                      <dt>Current reservation status</dt>
                      <dd>{formatStatus(details.payment.reservation.status)}</dd>
                    </div>

                    {details.refundStatus && (
                      <div>
                        <dt>Current refund status</dt>
                        <dd>{formatStatus(details.refundStatus)}</dd>
                      </div>
                    )}

                    {details.payment.collection && (
                      <div>
                        <dt>Receipt net collection</dt>
                        <dd>{formatPesos(details.payment.collection.netPaidCentavos)}</dd>
                      </div>
                    )}
                  </dl>

                  {(details.payment.requiresReview ||
                    details.payment.bookingRequiresReview) && (
                    <p role="alert">Financial review remains required.</p>
                  )}
                </>
              )}

              {state.recoveryMessage && <p role="alert">{state.recoveryMessage}</p>}

              <div className="actions">
                <button
                  type="button"
                  disabled={state.details.status === "loading"}
                  onClick={change.reloadRecords}
                >
                  Reload queues and financial records
                </button>

                <button
                  type="button"
                  disabled={state.details.status === "loading"}
                  onClick={checkStatusAction}
                >
                  Check saved request status
                </button>

                <button type="button" disabled={!change.reviewed} onClick={acknowledge}>
                  I reviewed the recorded outcome
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
