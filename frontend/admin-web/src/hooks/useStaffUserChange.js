import { useSyncExternalStore } from "react";
import { useAuth } from "../auth/useAuth";
import { getSession } from "../services/authApi";
import {
  getStaffUser,
  listStaffUsers,
  sendStaffUserChange,
  staffChangeMessage,
  staffRequestError,
} from "../services/staffUsersApi";

const idle = Object.freeze({ status: "idle" });
const states = new Map();
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(actorId) {
  return states.get(actorId) ?? idle;
}

function publish(actorId, state) {
  states.set(actorId, state);
  listeners.forEach((listener) => listener());
}

function isCurrentAdministrator(actorId) {
  const session = getSession();

  return (
    session.status === "authenticated" &&
    session.user?.id === actorId &&
    session.user.role === "ADMIN"
  );
}

export default function useStaffUserChange() {
  const { user } = useAuth();
  const actorId = user?.id;

  const state = useSyncExternalStore(
    subscribe,
    () => read(actorId),
    () => idle,
  );

  async function run(request) {
    if (
      !actorId ||
      !isCurrentAdministrator(actorId) ||
      read(actorId).status !== "idle"
    ) {
      return;
    }

    const context = {
      kind: request.kind,
      id: request.id,
      email: request.email ?? request.input.email,
    };

    publish(actorId, {
      ...context,
      status: "pending",
      message: "Saving staff account…",
    });

    try {
      const result = await sendStaffUserChange(request);

      publish(actorId, {
        ...context,
        id: result.user.id,
        status: "success",
        message: staffChangeMessage(result),
      });
    } catch (error) {
      const rejected = [400, 401, 403, 404, 409, 422, 429].includes(
        error.response?.status,
      );

      publish(actorId, {
        ...context,
        status: rejected ? "rejected" : "unknown",
        message: staffRequestError(error),
      });
    }
  }

  async function reconcile() {
    const current = read(actorId);

    if (
      !isCurrentAdministrator(actorId) ||
      !["success", "rejected", "unknown"].includes(current.status)
    ) {
      return;
    }

    const checking = { ...current, status: "checking" };
    publish(actorId, checking);

    try {
      let accounts;
      let complete = true;

      if (current.id) {
        accounts = [await getStaffUser(current.id)];
      } else {
        const result = await listStaffUsers({
          q: current.email.slice(0, 100),
          page: 1,
          limit: 50,
        });

        accounts = result.items.filter(
          (account) =>
            account.email.toLowerCase() === current.email.toLowerCase(),
        );
        complete = result.totalPages <= 1;
      }

      if (read(actorId) !== checking) return;

      publish(actorId, {
        ...current,
        status: "review",
        accounts,
        complete,
      });
    } catch (error) {
      if (read(actorId) !== checking) return;

      publish(actorId, {
        ...current,
        message:
          current.message + " Current account reload failed. " +
          staffRequestError(error),
      });
    }
  }

  function acknowledge() {
    if (
      !isCurrentAdministrator(actorId) ||
      read(actorId).status !== "review"
    ) {
      return;
    }

    states.delete(actorId);
    listeners.forEach((listener) => listener());
  }

  return {
    state,
    run,
    reconcile,
    acknowledge,
    blocked: state.status !== "idle",
  };
}
