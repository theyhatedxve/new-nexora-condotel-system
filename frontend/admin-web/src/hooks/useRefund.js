import {
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { useAuth } from "../auth/useAuth";
import api from "../services/api";
import { getSession } from "../services/authApi";

import {
  CASH_REFUND_REASONS,
  cashRefundRecordId,
  findCashRefund,
  recordCashRefund,
} from "../services/refundsApi";

const loading = Object.freeze({ status: "loading" });
const idle = Object.freeze({ status: "idle" });

const states = new Map();
const listeners = new Set();

function read(key) {
  return states.get(key) ?? loading;
}

function publish(key, state) {
  states.set(key, state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function authorized(actorId) {
  const session = getSession();

  return (
    session.status === "authenticated" &&
    session.user?.id === actorId &&
    ["ADMIN", "MANAGER"].includes(session.user?.role)
  );
}

function validIntent(intent, actorId, paymentId) {
  return (
    intent?.version === 1 &&
    intent.actorId === actorId &&
    intent.paymentId === paymentId &&
    typeof intent.requestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      intent.requestId,
    ) &&
    typeof intent.refundId === "string" &&
    /^rfd_[0-9a-f]{64}$/.test(intent.refundId) &&
    Number.isSafeInteger(intent.amountCentavos) &&
    intent.amountCentavos >= 1 &&
    intent.amountCentavos <= 2_147_483_647 &&
    CASH_REFUND_REASONS.some(
      (reason) => reason.value === intent.reason,
    ) &&
    Number.isSafeInteger(intent.attempts) &&
    intent.attempts >= 1
  );
}

function saveIntent(key, intent) {
  const serialized = JSON.stringify(intent);

  window.sessionStorage.setItem(key, serialized);

  if (window.sessionStorage.getItem(key) !== serialized) {
    throw new Error("Refund recovery could not be saved.");
  }
}

export function useRefund({
  paymentId,
  record,
  canRequest,
}) {
  const { user } = useAuth();
  const actorId = user?.id;
  const trigger = useRef(null);

  const key =
    "nexora:cash-refund:v1:" +
    encodeURIComponent(api.defaults.baseURL) +
    ":" +
    encodeURIComponent(actorId ?? "") +
    ":" +
    encodeURIComponent(paymentId);

  const state = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => loading,
  );

  useEffect(() => {
    if (!actorId || states.has(key)) return;

    try {
      const saved = window.sessionStorage.getItem(key);

      if (saved === null) {
        publish(key, idle);
        return;
      }

      const intent = JSON.parse(saved);

      if (!validIntent(intent, actorId, paymentId)) {
        throw new Error("Invalid refund recovery.");
      }

      publish(key, {
        status: "unresolved",
        intent,
        message:
          "A previous refund recording needs checking. " +
          "Check the original refund before submitting again.",
      });
    } catch {
      publish(key, {
        status: "blocked",
        message:
          "Refund recovery information could not be loaded. " +
          "Have the original attempt reviewed before recording again.",
      });
    }
  }, [actorId, key, paymentId]);

  const ready = record.status === "ready";

  const confirmationCurrent =
    state.status === "confirm" &&
    ready &&
    (state.retry || canRequest) &&
    record.data === state.snapshot;

  const freshReview =
    state.status === "completed" &&
    ready &&
    record.data !== state.baseline;

  function prepare(
    amountCentavos,
    reason,
    returned,
    button,
  ) {
    if (
      read(key).status !== "idle" ||
      !ready ||
      !canRequest ||
      !authorized(actorId)
    ) {
      throw new Error(
        "Load a supported Pay at Property payment first.",
      );
    }

    const receipt = record.data;
    const remaining = receipt.collection?.netPaidCentavos;

    if (
      returned !== true ||
      !Number.isSafeInteger(amountCentavos) ||
      amountCentavos < 1 ||
      amountCentavos > 2_147_483_647 ||
      amountCentavos > receipt.amountCentavos ||
      (
        Number.isSafeInteger(remaining) &&
        amountCentavos > remaining
      ) ||
      !CASH_REFUND_REASONS.some(
        (item) => item.value === reason,
      )
    ) {
      throw new Error(
        "Confirm returned money, choose a reason, and enter a valid amount within the recorded receipt figures.",
      );
    }

    if (!globalThis.crypto?.randomUUID) {
      throw new Error(
        "Refund recording requires a secure browser context.",
      );
    }

    trigger.current = button;

    publish(key, {
      status: "confirm",
      retry: false,
      snapshot: record.data,
      intent: {
        version: 1,
        actorId,
        paymentId,
        requestId: globalThis.crypto.randomUUID(),
        amountCentavos,
        reason,
        attempts: 0,
      },
    });
  }

  function prepareRetry(acknowledged, button) {
    const current = read(key);

    if (
      current.status !== "absent" ||
      acknowledged !== true ||
      !ready ||
      !authorized(actorId)
    ) {
      return;
    }

    trigger.current = button;

    publish(key, {
      status: "confirm",
      retry: true,
      snapshot: record.data,
      intent: current.intent,
    });
  }

  function back() {
    const current = read(key);

    if (current.status !== "confirm") return;

    publish(
      key,
      current.retry
        ? {
            status: "absent",
            intent: current.intent,
            message:
              "The original refund was not found. Only " +
              "the original recording may be retried.",
          }
        : idle,
    );

    window.requestAnimationFrame(() => {
      trigger.current?.focus();
    });
  }

  async function confirm() {
    const current = read(key);

    if (
      current !== state ||
      !confirmationCurrent ||
      !authorized(actorId)
    ) {
      return;
    }

    publish(key, {
      ...current,
      status: "pending",
    });

    let intent = current.intent;

    try {
      const refundId = await cashRefundRecordId(
        intent.requestId,
      );

      if (!authorized(actorId)) {
        publish(key, current);
        return;
      }

      intent = {
        ...intent,
        refundId,
        attempts: intent.attempts + 1,
      };

      saveIntent(key, intent);

      const refund = await recordCashRefund(intent);

      publish(key, {
        status: "completed",
        intent,
        refund,
        baseline: record.data,
        message: refund.alreadyRecorded
          ? "The backend returned the original completed refund."
          : "The backend confirmed the completed refund.",
      });

      record.reload();
    } catch (error) {
      const received = error.response?.data?.message;

      const reason = typeof received === "string"
        ? received.slice(0, 600)
        : Array.isArray(received)
          ? received
              .filter((item) => typeof item === "string")
              .join(" ")
              .slice(0, 600)
          : "";

      publish(key, {
        status: "unresolved",
        intent,
        message:
          (reason ? reason + " " : "") +
          "Do not start another refund recording. Check " +
          "the original refund to determine its outcome.",
      });

      record.reload();
    }
  }

  async function checkOriginal() {
    const current = read(key);

    if (
      !["unresolved", "absent"].includes(current.status) ||
      !authorized(actorId)
    ) {
      return;
    }

    publish(key, {
      ...current,
      status: "checking",
    });

    let intent = current.intent;

    try {
      const refundId = await cashRefundRecordId(
        intent.requestId,
      );

      intent = { ...intent, refundId };

      const refund = await findCashRefund(intent);

      publish(key, {
        status: "completed",
        intent,
        refund,
        baseline: record.data,
        message:
          "The original completed refund was found. " +
          "Review the refreshed payment and booking figures.",
      });

      record.reload();
    } catch (error) {
      const absent = error.response?.status === 404;

      publish(key, {
        status: absent ? "absent" : "unresolved",
        intent,
        message: absent
          ? (
              "The original refund was not found at this " +
              "time. Any retry must keep its original " +
              "amount, reason, and request reference."
            )
          : (
              "The original refund could not be safely " +
              "confirmed. Keep the original request and " +
              "resolve any financial review."
            ),
      });

      record.reload();
    }
  }

  function reloadForReview() {
    const current = read(key);

    if (current.status !== "completed") return;

    publish(key, {
      ...current,
      baseline: record.data,
    });

    record.reload();
  }

  function acknowledge() {
    if (
      !freshReview ||
      read(key) !== state ||
      !authorized(actorId)
    ) {
      return false;
    }

    try {
      window.sessionStorage.removeItem(key);

      if (window.sessionStorage.getItem(key) !== null) {
        throw new Error("Refund recovery was not cleared.");
      }

      publish(key, idle);
      return true;
    } catch {
      publish(key, {
        ...state,
        message:
          "Refund recovery could not be cleared. The " +
          "original result is retained; do not record it again.",
      });

      return false;
    }
  }

  return {
    state,
    ready,
    confirmationCurrent,
    freshReview,
    prepare,
    prepareRetry,
    back,
    confirm,
    checkOriginal,
    reloadForReview,
    acknowledge,
  };
}