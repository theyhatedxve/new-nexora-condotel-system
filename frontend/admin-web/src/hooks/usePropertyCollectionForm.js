import { useEffect, useRef, useState } from "react";
import { usePropertyCollection } from "./usePropertyCollection";
import { parsePropertyCollectionAmount } from "../services/paymentsApi";
import { philippineToday } from "../utils/propertyCollectionHelpers.js";

export default function usePropertyCollectionForm({
  reservationId,
  record,
  payment,
  onReload,
}) {
  const [amount, setAmount] = useState("");

  const [received, setReceived] = useState(false);

  const [retryAcknowledged, setRetryAcknowledged] = useState(false);

  const [error, setError] = useState("");

  const panelHeading = useRef(null);

  const booking = record.status === "ready" ? record.data : null;

  const summary = payment.status === "ready" ? payment.data : null;

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

  const result = ["recorded", "rejected"].includes(state.status);

  const recovery = ["unresolved", "absent"].includes(state.status);

  function changeAmount(event) {
    return setAmount(event.target.value);
  }

  function changeReceived(event) {
    return setReceived(event.target.checked);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && confirming) {
      event.preventDefault();
      change.back();
    }
  }

  function confirmAction() {
    void change.confirm();
  }

  function checkOriginalAction() {
    void change.checkOriginal();
  }

  function changeRetryAcknowledged(event) {
    return setRetryAcknowledged(event.target.checked);
  }

  function prepareRetryAction(event) {
    return change.prepareRetry(retryAcknowledged, event.currentTarget);
  }

  return {
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
  };
}
