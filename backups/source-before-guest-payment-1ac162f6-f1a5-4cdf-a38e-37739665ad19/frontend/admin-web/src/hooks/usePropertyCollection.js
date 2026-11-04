import {
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { useAuth } from "../auth/useAuth";
import api from "../services/api";
import { getSession } from "../services/authApi";

import {
  findPropertyCollection,
  propertyCollectionReceiptId,
  recordPropertyCollection,
} from "../services/paymentsApi";

const loading = Object.freeze({ status: "loading" });
const idle = Object.freeze({ status: "idle" });

const states = new Map();
const listeners = new Set();

const staffRoles = [
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
];

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

function saveIntent(key, intent) {
  const serialized = JSON.stringify(intent);

  window.sessionStorage.setItem(key, serialized);

  if (window.sessionStorage.getItem(key) !== serialized) {
    throw new Error("Collection recovery could not be saved.");
  }
}

function validIntent(intent, actorId, reservationId) {
  return (
    intent?.version === 1 &&
    intent.actorId === actorId &&
    intent.reservationId === reservationId &&
    typeof intent.requestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      intent.requestId,
    ) &&
    typeof intent.receiptId === "string" &&
    /^pap_[0-9a-f]{64}$/.test(intent.receiptId) &&
    Number.isSafeInteger(intent.amountCentavos) &&
    intent.amountCentavos >= 1 &&
    intent.amountCentavos <= 2_147_483_647 &&
    Number.isSafeInteger(intent.attempts) &&
    intent.attempts >= 1
  );
}

function authenticatedAs(actorId) {
  const session = getSession();

  return (
    session.status === "authenticated" &&
    session.user?.id === actorId &&
    staffRoles.includes(session.user?.role)
  );
}

export function usePropertyCollection({
  reservationId,
  record,
  payment,
  eligible,
  onReload,
}) {
  const { user } = useAuth();
  const actorId = user?.id;
  const trigger = useRef(null);

  const key =
    "nexora:property-collection:v1:" +
    encodeURIComponent(api.defaults.baseURL) +
    ":" +
    encodeURIComponent(actorId ?? "") +
    ":" +
    encodeURIComponent(reservationId);

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

      if (!validIntent(intent, actorId, reservationId)) {
        throw new Error("Invalid recovery information.");
      }

      publish(key, {
        status: "unresolved",
        intent,
        message:
          "A previous collection needs checking. Check its " +
          "original receipt before attempting another recording.",
      });
    } catch {
      publish(key, {
        status: "blocked",
        message:
          "Collection recovery information could not be loaded. " +
          "Have the original attempt reviewed before recording again.",
      });
    }
  }, [actorId, key, reservationId]);

  const ready =
    record.status === "ready" &&
    payment.status === "ready";

  const confirmationCurrent =
    state.status === "confirm" &&
    record.status === "ready" &&
    (
      state.retry ||
      (ready && eligible)
    ) &&
    record.data === state.snapshot[0] &&
    payment.data === state.snapshot[1];

  const freshReview =
    ["recorded", "rejected"].includes(state.status) &&
    ready &&
    Boolean(state.baseline) &&
    record.data !== state.baseline[0] &&
    payment.data !== state.baseline[1];

  function prepare(amountCentavos, received, button) {
    if (
      read(key).status !== "idle" ||
      !ready ||
      !eligible ||
      !authenticatedAs(actorId)
    ) {
      throw new Error(
        "Load an eligible booking and its current payment summary first.",
      );
    }

    if (
      received !== true ||
      !Number.isSafeInteger(amountCentavos) ||
      amountCentavos < 1 ||
      amountCentavos > 2_147_483_647 ||
      amountCentavos > payment.data.balanceDueCentavos
    ) {
      throw new Error(
        "Confirm receipt of a valid amount within the remaining balance.",
      );
    }

    if (!globalThis.crypto?.randomUUID) {
      throw new Error(
        "Collection recording requires a secure browser context.",
      );
    }

    trigger.current = button;

    publish(key, {
      status: "confirm",
      retry: false,
      intent: {
        version: 1,
        actorId,
        reservationId,
        requestId: globalThis.crypto.randomUUID(),
        amountCentavos,
        attempts: 0,
      },
      snapshot: [record.data, payment.data],
    });
  }

  function prepareRetry(acknowledged, button) {
    const current = read(key);

    if (
      current.status !== "absent" ||
      acknowledged !== true ||
      record.status !== "ready" ||
      !authenticatedAs(actorId)
    ) {
      return;
    }

    trigger.current = button;

    publish(key, {
      status: "confirm",
      retry: true,
      intent: current.intent,
      snapshot: [record.data, payment.data],
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
              "The original receipt was not found. Only the " +
              "original request may be retried.",
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
      !authenticatedAs(actorId)
    ) {
      return;
    }

    publish(key, {
      ...current,
      status: "pending",
    });

    let intent = current.intent;
    let sent = false;

    try {
      const receiptId = await propertyCollectionReceiptId(
        intent.requestId,
      );

      if (!authenticatedAs(actorId)) {
        publish(key, current);
        return;
      }

      intent = {
        ...intent,
        receiptId,
        attempts: intent.attempts + 1,
      };

      saveIntent(key, intent);

      sent = true;

      const receipt = await recordPropertyCollection(
        intent,
        record.data.reservationNumber,
      );

      publish(key, {
        status: "recorded",
        intent,
        receipt,
        baseline: [record.data, payment.data],
        message: receipt.alreadyRecorded
          ? "The backend returned the original recorded collection."
          : "The backend confirmed the collection.",
      });

      onReload();
    } catch (error) {
      const code = error.response?.status;

      const rejected =
        sent &&
        !current.retry &&
        [
          400,
          401,
          403,
          404,
          409,
          422,
          429,
        ].includes(code);

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
        status: rejected ? "rejected" : "unresolved",
        intent,
        baseline: [record.data, payment.data],
        message: rejected
          ? reason || "The backend rejected this collection."
          : (
              "The result is uncertain or recovery could not " +
              "be saved. Do not create another collection. " +
              "Check the original receipt."
            ),
      });

      onReload();
    }
  }

  async function checkOriginal() {
    const current = read(key);

    if (
      !["unresolved", "absent"].includes(current.status) ||
      !authenticatedAs(actorId)
    ) {
      return;
    }

    publish(key, {
      ...current,
      status: "checking",
    });

    let intent = current.intent;

    try {
      const receiptId = await propertyCollectionReceiptId(
        intent.requestId,
      );

      intent = { ...intent, receiptId };

      const receipt = await findPropertyCollection(intent);

      publish(key, {
        status: "recorded",
        intent,
        receipt,
        baseline: [record.data, payment.data],
        message:
          "The original collection record was found. Review " +
          "the refreshed booking summary and any financial warnings.",
      });

      onReload();
    } catch (error) {
      const absent = error.response?.status === 404;

      publish(key, {
        status: absent ? "absent" : "unresolved",
        intent,
        message: absent
          ? (
              "The original receipt was not found at this time. " +
              "If recording is still needed, retry only the " +
              "original request. Do not collect the money again."
            )
          : (
              "The original receipt could not be safely checked. " +
              "Keep the original request and try checking again."
            ),
      });

      onReload();
    }
  }

  function reloadForReview() {
    const current = read(key);

    if (
      !["recorded", "rejected"].includes(current.status)
    ) {
      return;
    }

    publish(key, {
      ...current,
      baseline: [record.data, payment.data],
    });

    onReload();
  }

  function acknowledge() {
    if (
      !freshReview ||
      read(key) !== state ||
      !authenticatedAs(actorId)
    ) {
      return false;
    }

    try {
      window.sessionStorage.removeItem(key);

      if (window.sessionStorage.getItem(key) !== null) {
        throw new Error("Recovery information was not cleared.");
      }

      publish(key, idle);
      return true;
    } catch {
      publish(key, {
        ...state,
        message:
          "The result is retained because recovery information " +
          "could not be cleared. Do not start another recording.",
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