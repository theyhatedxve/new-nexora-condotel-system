import api from "./api";

let session = {
  status: "loading",
  user: null,
  message: "",
};

let revision = 0;
let operation = null;
let logoutOperation = null;
let lastVerified = 0;

const listeners = new Set();

function publish(status, user = null, message = "") {
  session = { status, user, message };
  listeners.forEach((listener) => listener());
}

function clearToken() {
  delete api.defaults.headers.common.Authorization;
}

async function identify(result, currentRevision) {
  if (currentRevision !== revision) return;

  if (
    typeof result?.accessToken !== "string" ||
    !result.accessToken ||
    result.tokenType !== "Bearer"
  ) {
    throw new Error("Invalid session response.");
  }

  api.defaults.headers.common.Authorization =
    "Bearer " + result.accessToken;

  const response = await api.get("/auth/me");

  if (currentRevision !== revision) return;

  const user = response.data?.data;

  if (
    typeof user?.id !== "string" ||
    typeof user.email !== "string" ||
    !["ADMIN", "MANAGER", "RECEPTIONIST", "GUEST"].includes(user.role)
  ) {
    throw new Error("Invalid identity response.");
  }

  lastVerified = Date.now();
  publish("authenticated", user);
}

export function subscribeSession(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function getSession() {
  return session;
}

export function restoreSession({ ifStale = false } = {}) {
  if (logoutOperation) return logoutOperation;
  if (session.status === "logout-error") return signOut();
  if (operation) return operation;

  if (ifStale && Date.now() - lastVerified < 60_000) {
    return Promise.resolve();
  }

  const currentRevision = revision;

  operation = (async () => {
    try {
      const response = await api.post("/auth/refresh");
      await identify(response.data?.data, currentRevision);
    } catch (error) {
      if (currentRevision !== revision) return;

      clearToken();

      if (error.response?.status === 401) {
        publish("anonymous", null, "Please sign in to continue.");
      } else {
        publish(
          "error",
          null,
          "We could not check your session. Please try again.",
        );
      }
    } finally {
      operation = null;
    }
  })();

  return operation;
}

export function signIn(email, password) {
  if (logoutOperation) return logoutOperation;
  if (operation) return operation;

  const currentRevision = ++revision;

  clearToken();
  publish("loading");

  operation = (async () => {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      await identify(response.data?.data, currentRevision);
    } catch (error) {
      if (currentRevision !== revision) return;

      clearToken();

      const status = error.response?.status;

      if (
        status === 403 &&
        error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED"
      ) {
        publish(
          "anonymous",
          null,
          "Replace your temporary password before signing in.",
        );

        return { passwordChangeRequired: true };
      }

      const message =
        status === 401
          ? "Sign-in failed. Check your credentials and account access."
          : status === 429
            ? "Too many attempts. Please wait a minute before trying again."
            : "Sign-in could not be completed. Please try again.";

      publish("anonymous", null, message);
    } finally {
      operation = null;
    }
  })();

  return operation;
}

export function signOut() {
  if (logoutOperation) return logoutOperation;

  ++revision;

  const pending = operation;

  clearToken();
  publish("loading");

  logoutOperation = (async () => {
    await pending;

    try {
      await api.post("/auth/logout");
      publish("anonymous", null, "You have signed out.");
    } catch {
      publish(
        "logout-error",
        null,
        "Server sign-out could not be confirmed. Retry before leaving this device.",
      );
    } finally {
      clearToken();
      logoutOperation = null;
    }
  })();

  return logoutOperation;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth/")
    ) {
      ++revision;
      clearToken();

      publish(
        "anonymous",
        null,
        "Your session ended. Please sign in again.",
      );
    }

    return Promise.reject(error);
  },
);
