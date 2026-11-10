import { useEffect, useRef, useState } from "react";
import { useReconciliation } from "./useReconciliation";

export default function useReconciliationActions({ queue }) {
  const change = useReconciliation(queue);

  const [kind, setKind] = useState("payment");

  const [targetId, setTargetId] = useState("");

  const [eventId, setEventId] = useState("");

  const [providerReference, setProviderReference] = useState("");

  const [lateAcknowledged, setLateAcknowledged] = useState(false);

  const [retryAcknowledged, setRetryAcknowledged] = useState(false);

  const [error, setError] = useState("");

  const heading = useRef(null);

  const state = change.state;

  useEffect(() => {
    if (state.status !== "idle") {
      heading.current?.focus();
    }
  }, [state.status]);

  const data = queue.status === "ready" ? queue.data : null;

  const paymentIds = [
    ...new Set([
      ...(data?.payments.map((item) => item.id) ?? []),
      ...(data?.events
        .filter(
          (item) => item.paymentId && item.eventType === "checkout_session.payment.paid",
        )
        .map((item) => item.paymentId) ?? []),
    ]),
  ];

  const selectedRefund = data?.refunds.find((item) => item.id === targetId);

  const linkedEvents =
    data?.events.filter(
      (item) =>
        item.paymentId === targetId &&
        item.eventType === "checkout_session.payment.paid" &&
        /^evt_[A-Za-z0-9_]{1,96}$/.test(item.providerEventId),
    ) ?? [];

  function chooseKind(value) {
    setKind(value);
    setTargetId("");
    setEventId("");
    setProviderReference("");
    setLateAcknowledged(false);
    setError("");
  }

  function chooseTarget(value) {
    setTargetId(value);
    setEventId("");
    setProviderReference("");
    setLateAcknowledged(false);
    setError("");
  }

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      if (!data) {
        throw new Error("Load the review queues first.");
      }

      if (kind === "payment") {
        if (!paymentIds.includes(targetId)) {
          throw new Error("Choose an existing payment from this review queue.");
        }

        change.prepare(
          {
            kind,
            targetId,
            eventId,
            acknowledgeLateCapture: lateAcknowledged,
          },
          event.nativeEvent.submitter,
        );
      } else {
        if (!selectedRefund) {
          throw new Error("Choose an existing refund from this review queue.");
        }

        change.prepare(
          {
            kind,
            targetId,
            paymentId: selectedRefund.paymentId,
            providerRefundId:
              selectedRefund.providerRefundId || providerReference || undefined,
          },
          event.nativeEvent.submitter,
        );
      }
    } catch (failure) {
      setError(failure.message);
    }
  }

  function acknowledge() {
    if (change.acknowledge()) {
      setRetryAcknowledged(false);
      setLateAcknowledged(false);
      setError("");
    }
  }

  const confirming = state.status === "confirm";

  const recovery = ["unknown", "absent"].includes(state.status);

  const details =
    state.status === "done" && state.details.status === "ready"
      ? state.details.data
      : null;

  function handleChooseKind(event) {
    return chooseKind(event.target.value);
  }

  function handleChooseTarget(event) {
    return chooseTarget(event.target.value);
  }

  function changeEventId(event) {
    return setEventId(event.target.value);
  }

  function changeLateAcknowledged(event) {
    return setLateAcknowledged(event.target.checked);
  }

  function changeProviderReference(event) {
    return setProviderReference(event.target.value);
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

  function checkStatusAction() {
    void change.checkStatus();
  }

  function changeRetryAcknowledged(event) {
    return setRetryAcknowledged(event.target.checked);
  }

  function prepareRetryAction(event) {
    return change.prepareRetry(retryAcknowledged, event.currentTarget);
  }

  return {
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
  };
}
