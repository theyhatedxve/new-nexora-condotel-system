import {
  useRef,
  useSyncExternalStore,
} from "react";

import { useAuth } from "../auth/useAuth";
import { getSession } from "../services/authApi";

import {
  createRoomChangeRequest,
  sendRoomChange,
} from "../services/roomsApi";

const idle = Object.freeze({ status: "idle" });
const states = new Map();
const listeners = new Set();

function read(actorId) {
  return states.get(actorId) ?? idle;
}

function publish(actorId, value) {
  if (value === idle) {
    states.delete(actorId);
  } else {
    states.set(actorId, value);
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function useRoomChange({
  scope,
  sources,
  onReload,
  createRequest = createRoomChangeRequest,
  sendRequest = sendRoomChange,
}) {
  const { user } = useAuth();
  const actorId = user?.id;
  const trigger = useRef(null);

  const state = useSyncExternalStore(
    subscribe,
    () => read(actorId),
    () => idle,
  );

  const ready = sources.every(
    (source) => source.status === "ready",
  );

  const sameScope =
    state.status === "idle" ||
    state.scope === scope;

  const confirmationCurrent =
    state.status === "confirm" &&
    sameScope &&
    ready &&
    sources.length === state.snapshot.length &&
    sources.every(
      (source, index) =>
        source.data === state.snapshot[index],
    );

  const freshReview =
    state.status === "review" &&
    sameScope &&
    ready &&
    sources.length === state.baseline.length &&
    sources.every(
      (source, index) =>
        source.data !== state.baseline[index],
    );

  function prepare(input, title, lines, button) {
    if (
      !actorId ||
      !["ADMIN", "MANAGER"].includes(user?.role)
    ) {
      throw new Error("Room management permission is required.");
    }

    if (read(actorId).status !== "idle" || !ready) {
      throw new Error(
        "Finish the current review and load the records first.",
      );
    }

    const request = createRequest(input);
    trigger.current = button;

    publish(actorId, {
      status: "confirm",
      scope,
      title,
      lines: [...lines],
      request,
      snapshot: sources.map((source) => source.data),
    });
  }

  function back() {
    if (read(actorId).status !== "confirm") return;

    publish(actorId, idle);

    window.requestAnimationFrame(() => {
      trigger.current?.focus();
    });
  }

  async function confirm() {
    const current = read(actorId);
    const session = getSession();

    if (
      current !== state ||
      !confirmationCurrent ||
      session.status !== "authenticated" ||
      session.user?.id !== actorId ||
      !["ADMIN", "MANAGER"].includes(session.user?.role)
    ) {
      return;
    }

    publish(actorId, {
      ...current,
      status: "pending",
    });

    try {
      await sendRequest(current.request);

      publish(actorId, {
        scope,
        title: current.title,
        lines: current.lines,
        status: "result",
        outcome: "success",
        message: "The backend confirmed the change.",
      });
    } catch (error) {
      const code = error.response?.status;

      const rejected = [
        400,
        401,
        403,
        404,
        409,
        422,
        429,
      ].includes(code);

      const received = error.response?.data?.message;

      const safeMessage = typeof received === "string"
        ? received.slice(0, 600)
        : Array.isArray(received)
          ? received
              .filter((item) => typeof item === "string")
              .join(" ")
              .slice(0, 600)
          : "";

      publish(actorId, {
        scope,
        title: current.title,
        lines: current.lines,
        status: "result",
        outcome: rejected ? "rejected" : "unknown",
        message: rejected
          ? safeMessage || "The backend rejected this change."
          : (
              "The result is uncertain. The change may have " +
              "been saved. Review current records before " +
              "deciding whether another submission is needed."
            ),
      });
    }
  }

  function reloadForReview() {
    const current = read(actorId);

    if (
      current.scope !== scope ||
      !["result", "review"].includes(current.status)
    ) {
      return;
    }

    publish(actorId, {
      ...current,
      status: "review",
      baseline: sources.map((source) => source.data),
    });

    onReload();
  }

  function acknowledge() {
    if (!freshReview || read(actorId) !== state) return;

    publish(actorId, idle);
  }

  return {
    state,
    ready,
    sameScope,
    confirmationCurrent,
    freshReview,
    disabled: state.status !== "idle" || !ready,
    prepare,
    back,
    confirm,
    reloadForReview,
    acknowledge,
  };
}