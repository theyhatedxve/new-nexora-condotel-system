import { useEffect, useRef, useState } from "react";
import { useRefund } from "./useRefund";
import { CASH_REFUND_REASONS, parseRefundAmount } from "../services/refundsApi";

export default function usePaymentRefundForm({ paymentId, record }) {
  const [amount, setAmount] = useState("");

  const [reason, setReason] = useState("");

  const [returned, setReturned] = useState(false);

  const [retryAcknowledged, setRetryAcknowledged] = useState(false);

  const [error, setError] = useState("");

  const panelHeading = useRef(null);

  const payment = record.status === "ready" ? record.data : null;

  const canRequest = Boolean(
    payment &&
    payment.method === "PAY_AT_PROPERTY" &&
    payment.currency === "PHP" &&
    ["PAID", "PARTIALLY_REFUNDED"].includes(payment.status) &&
    ["CONFIRMED", "CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(
      payment.reservation.status,
    ) &&
    payment.bookingSummary !== null &&
    !payment.bookingSummary.hasPendingPayment &&
    Number.isSafeInteger(payment.amountCentavos) &&
    payment.amountCentavos > 0,
  );

  const change = useRefund({
    paymentId,
    record,
    canRequest,
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
        parseRefundAmount(amount),
        reason,
        returned,
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function acknowledge() {
    if (change.acknowledge()) {
      setReturned(false);
      setRetryAcknowledged(false);
      setError("");
    }
  }

  if (state.status === "idle" && payment && payment.method !== "PAY_AT_PROPERTY") {
    return {
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
      changeAmount,
      changeReason,
      changeReturned,
      handleKeyDown,
      confirmAction,
      checkOriginalAction,
      changeRetryAcknowledged,
      prepareRetryAction,
    };
  }

  const confirming = state.status === "confirm";

  const pending = state.status === "pending";

  const checking = state.status === "checking";

  const recovery = ["unresolved", "absent"].includes(state.status);

  const reasonLabel = (value) =>
    CASH_REFUND_REASONS.find((item) => item.value === value)?.label ?? value;

  function changeAmount(event) {
    return setAmount(event.target.value);
  }

  function changeReason(event) {
    return setReason(event.target.value);
  }

  function changeReturned(event) {
    return setReturned(event.target.checked);
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
  };
}
