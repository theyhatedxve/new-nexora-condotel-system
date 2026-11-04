import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router";

import {
  usePropertyCollection,
} from "../hooks/usePropertyCollection";

import {
  parsePropertyCollectionAmount,
} from "../services/paymentsApi";

import { formatPesos } from "../utils/formatters";

function philippineToday() {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return [
    value("year"),
    value("month"),
    value("day"),
  ].join("-");
}

export default function PropertyCollection({
  reservationId,
  record,
  payment,
  onReload,
}) {
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState(false);
  const [retryAcknowledged, setRetryAcknowledged] =
    useState(false);
  const [error, setError] = useState("");

  const panelHeading = useRef(null);

  const booking =
    record.status === "ready" ? record.data : null;

  const summary =
    payment.status === "ready" ? payment.data : null;

  const eligible = Boolean(
    booking &&
    summary &&
    ["CONFIRMED", "CHECKED_IN"].includes(booking.status) &&
    booking.checkOutDate.slice(0, 10) > philippineToday() &&
    !summary.requiresReview &&
    !summary.hasPendingPayment &&
    summary.pendingRefundCentavos === 0 &&
    summary.refundedCentavos === 0 &&
    Number.isSafeInteger(summary.balanceDueCentavos) &&
    summary.balanceDueCentavos > 0,
  );

  const change = usePropertyCollection({
    reservationId,
    record,
    payment,
    eligible,
    onReload,
  });

  const state = change.state;

  useEffect(() => {
    if (state.status !== "idle") {
      panelHeading.current?.focus();
    }
  }, [state.status]);

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      change.prepare(
        parsePropertyCollectionAmount(amount),
        received,
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function acknowledge() {
    if (change.acknowledge()) {
      setReceived(false);
      setRetryAcknowledged(false);
      setError("");
    }
  }

  const confirming = state.status === "confirm";
  const pending = state.status === "pending";
  const checking = state.status === "checking";

  const result = [
    "recorded",
    "rejected",
  ].includes(state.status);

  const recovery = [
    "unresolved",
    "absent",
  ].includes(state.status);

  return (
    <section
      className="record-section room-management"
      aria-labelledby="property-collection-title"
    >
      <h2 id="property-collection-title">
        Record Pay at Property collection
      </h2>

      <p>
        Record payment already received from the guest.
        This action does not charge an online payment method.
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
          New collection is unavailable for this booking’s
          current stay or payment state. Resolve any pending
          attempts or financial review first.
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={
            state.status !== "idle" ||
            !change.ready ||
            !eligible
          }
        >
          <legend>Payment received</legend>

          <label htmlFor="property-collection-amount">
            Amount received in PHP
          </label>
          <input
            id="property-collection-amount"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            maxLength={11}
            required
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
          />

          <label className="action-checkbox">
            <input
              type="checkbox"
              checked={received}
              onChange={(event) =>
                setReceived(event.target.checked)
              }
            />
            <span>
              I confirm that this payment has actually
              been received.
            </span>
          </label>

          <button
            type="submit"
            disabled={!received}
          >
            Review collection
          </button>
        </fieldset>
      </form>

      {state.status === "loading" && (
        <p role="status">Checking collection recovery…</p>
      )}

      {state.status !== "idle" &&
        state.status !== "loading" && (
          <section
            className="action-review"
            aria-labelledby="collection-review-title"
            onKeyDown={(event) => {
              if (
                event.key === "Escape" &&
                confirming
              ) {
                event.preventDefault();
                change.back();
              }
            }}
          >
            <h3
              id="collection-review-title"
              ref={panelHeading}
              tabIndex={-1}
            >
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
                  <strong>
                    {formatPesos(
                      state.intent.amountCentavos,
                    )}
                  </strong>
                </p>

                <p>
                  Request reference:{" "}
                  {state.intent.requestId}
                </p>
              </>
            )}

            {confirming && (
              <>
                <p>
                  Booking:{" "}
                  {booking?.reservationNumber}
                </p>

                <p>
                  {state.retry
                    ? (
                        "This retries the original recording " +
                        "with the same amount and request " +
                        "reference. No additional money " +
                        "should be collected."
                      )
                    : (
                        "Confirm only after checking the " +
                        "booking, amount, and payment received."
                      )}
                </p>

                {!change.confirmationCurrent && (
                  <p role="alert">
                    The booking or payment records changed.
                    Go back and review again.
                  </p>
                )}

                <div className="actions">
                  <button
                    type="button"
                    onClick={change.back}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={!change.confirmationCurrent}
                    onClick={() => {
                      void change.confirm();
                    }}
                  >
                    {state.retry
                      ? "Retry original recording"
                      : "Confirm collection"}
                  </button>
                </div>
              </>
            )}

            {(pending || checking) && (
              <p role="status">
                {pending
                  ? (
                      "Recording the collection. Do not " +
                      "submit it again."
                    )
                  : "Checking the original receipt…"}
              </p>
            )}

            {state.message && (
              <p role="status">{state.message}</p>
            )}

            {state.status === "recorded" && (
              <p>
                <Link
                  to={
                    "/payments/" +
                    encodeURIComponent(state.receipt.id)
                  }
                >
                  View original collection record
                </Link>
              </p>
            )}

            {result && (
              <>
                <p>
                  Review the refreshed payment summary
                  above before acknowledging this result.
                </p>

                <button
                  type="button"
                  onClick={change.reloadForReview}
                  disabled={!change.ready}
                >
                  Reload booking records
                </button>

                <button
                  type="button"
                  disabled={!change.freshReview}
                  onClick={acknowledge}
                >
                  I reviewed the current records
                </button>
              </>
            )}

            {recovery && (
              <button
                type="button"
                onClick={() => {
                  void change.checkOriginal();
                }}
              >
                Check original receipt
              </button>
            )}

            {state.status === "absent" && (
              <>
                <label className="action-checkbox">
                  <input
                    type="checkbox"
                    checked={retryAcknowledged}
                    onChange={(event) =>
                      setRetryAcknowledged(
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    I am retrying the same collection
                    recording. No additional payment
                    has been received for this retry.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={
                    !retryAcknowledged ||
                    record.status !== "ready"
                  }
                  onClick={(event) =>
                    change.prepareRetry(
                      retryAcknowledged,
                      event.currentTarget,
                    )
                  }
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