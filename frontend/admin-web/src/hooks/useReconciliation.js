import {
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { useAuth } from "../auth/useAuth";
import api from "../services/api";
import { getSession } from "../services/authApi";

import {
  getReconciliationFinancialRecords,
  getReconciliationRequestStatus,
  normalizeReconciliationInput,
  submitReconciliation,
} from "../services/reconciliationApi";

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

function saveIntent(key, intent) {
  const serialized = JSON.stringify(intent);

  window.sessionStorage.setItem(key, serialized);

  if (window.sessionStorage.getItem(key) !== serialized) {
    throw new Error(
      "Reconciliation recovery could not be saved.",
    );
  }
}

function restoreIntent(value, actorId) {
  if (
    value?.version !== 1 ||
    value.actorId !== actorId ||
    typeof value.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.requestId,
    ) ||
    !Number.isSafeInteger(value.attempts) ||
    value.attempts < 1
  ) {
    throw new Error("Invalid recovery information.");
  }

  return {
    version: 1,
    actorId,
    requestId: value.requestId.toLowerCase(),
    attempts: value.attempts,
    ...normalizeReconciliationInput(value),
  };
}

export function useReconciliation(queue) {
  const { user } = useAuth();
  const actorId = user?.id;
  const trigger = useRef(null);

  const key =
    "nexora:reconciliation:v1:" +
    encodeURIComponent(api.defaults.baseURL) +
    ":" +
    encodeURIComponent(actorId ?? "");

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

      if (saved.length > 4000) {
        throw new Error("Invalid recovery information.");
      }

      const intent = restoreIntent(
        JSON.parse(saved),
        actorId,
      );

      publish(key, {
        status: "unknown",
        intent,
        message:
          "A previous request needs checking. Read its " +
          "saved status before considering another submission.",
      });
    } catch {
      publish(key, {
        status: "blocked",
        message:
          "Recovery information could not be loaded. " +
          "Have the original request reviewed before continuing.",
      });
    }
  }, [actorId, key]);

  const ready = queue.status === "ready";

  const confirmationCurrent =
  state.status === "confirm" &&
  ready &&
  queue.data === state.snapshot;

  const reviewed =
    state.status === "done" &&
    ready &&
    queue.data !== state.baseline &&
    ["ready", "review"].includes(state.details.status);

  function prepare(input, button) {
    if (
      read(key).status !== "idle" ||
      !ready ||
      !authorized(actorId)
    ) {
      throw new Error(
        "Load the queue and finish any existing request first.",
      );
    }

    if (!globalThis.crypto?.randomUUID) {
      throw new Error(
        "Reconciliation requires a secure browser context.",
      );
    }

    const normalized = normalizeReconciliationInput(input);

    trigger.current = button;

    publish(key, {
      status: "confirm",
      retry: false,
      snapshot: queue.data,
      intent: {
        version: 1,
        actorId,
        requestId: globalThis.crypto.randomUUID(),
        attempts: 0,
        ...normalized,
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
        snapshot: queue.data,
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
              "No completed result was found. Only the " +
              "original request may be retried.",
          }
        : idle,
    );

    window.requestAnimationFrame(() => {
      trigger.current?.focus();
    });
  }

  async function loadResult(intent, result) {
    const current = {
      status: "done",
      intent,
      result,
      baseline: queue.data,
      details: { status: "loading" },
    };

    publish(key, current);
    queue.reload();

    try {
      const details =
        await getReconciliationFinancialRecords(intent);

      if (read(key) === current) {
        publish(key, {
          ...current,
          details: {
            status: "ready",
            data: details,
          },
        });
      }
    } catch (error) {
      if (read(key) === current) {
        publish(key, {
          ...current,
          details: {
            status: error.response?.status === 409
              ? "review"
              : "error",
          },
        });
      }
    }
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

    const intent = {
      ...current.intent,
      attempts: current.intent.attempts + 1,
    };

    try {
      saveIntent(key, intent);

      const result = await submitReconciliation(intent);

      await loadResult(intent, result);
    } catch {
      publish(key, {
        status: "unknown",
        intent,
        message:
          "The result could not be confirmed. Keep the " +
          "original inputs and check the saved request status.",
      });

      queue.reload();
    }
  }

  async function checkStatus() {
    const current = read(key);

    if (
      !["unknown", "absent", "done"].includes(current.status) ||
      !authorized(actorId)
    ) {
      return;
    }

    publish(key, {
      status: "checking",
      intent: current.intent,
    });

    try {
      const result =
        await getReconciliationRequestStatus(current.intent);

      await loadResult(current.intent, result);
    } catch (error) {
      const absent = error.response?.status === 404;

      publish(key, {
        status: absent ? "absent" : "unknown",
        intent: current.intent,
        message: absent
          ? (
              "No completed result was found. The original " +
              "request may still be running or its target " +
              "may be unavailable. Any retry must keep " +
              "the original identifier and inputs."
            )
          : (
              "The saved result could not be safely read. " +
              "Keep the original request and resolve any " +
              "access or input mismatch."
            ),
      });
    }
  }

  function reloadRecords() {
    const current = read(key);

    if (
      current.status !== "done" ||
      current.details.status === "loading" ||
      !authorized(actorId)
    ) {
      return;
    }

    void loadResult(current.intent, current.result);
  }

  function acknowledge() {
    if (
      !reviewed ||
      read(key) !== state ||
      !authorized(actorId)
    ) {
      return false;
    }

    try {
      window.sessionStorage.removeItem(key);

      if (window.sessionStorage.getItem(key) !== null) {
        throw new Error("Recovery was not cleared.");
      }

      publish(key, idle);
      return true;
    } catch {
      publish(key, {
        ...state,
        recoveryMessage:
          "Recovery could not be cleared. Keep the " +
          "original result and do not start another request.",
      });

      return false;
    }
  }

  return {
    state,
    ready,
    confirmationCurrent,
    reviewed,
    prepare,
    prepareRetry,
    back,
    confirm,
    checkStatus,
    reloadRecords,
    acknowledge,
  };
}