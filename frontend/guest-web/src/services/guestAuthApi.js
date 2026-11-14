import { api } from "./api";

const listeners = new Set();
let session = { status: "loading", user: null, message: "" };
let revision = 0;
let operation = null;
let logoutOperation = null;
let lastVerified = 0;

function publish(status, user = null, message = "") {
  session = { status, user, message };
  listeners.forEach((listener) => listener());
}

function clearToken() {
  delete api.defaults.headers.common.Authorization;
}

function cookieRequest(path, body) {
  const request = () => api.post(path, body);

  // Cookie rotation is shared by guest tabs, while module state is tab-local.
  if (navigator.locks?.request) {
    return navigator.locks.request("nexora-guest-auth-cookie", request);
  }

  return request();
}

export function getGuestSession() {
  return session;
}

export function subscribeGuestSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function guestAuthError(error) {
  const status = error.response?.status;
  if (status === 429) {
    return "Too many attempts. Wait a minute before trying again.";
  }
  if (status === 400) {
    return "Check the information you entered and try again.";
  }
  if (status === 401) {
    return "Check your credentials and make sure your email is verified.";
  }
  if (status === 403) {
    return "This account cannot complete this action.";
  }
  return "The request could not be confirmed. Check your connection and try again.";
}

async function identify(result, expectedRevision) {
  if (revision !== expectedRevision) return;
  if (
    typeof result?.accessToken !== "string" ||
    !result.accessToken ||
    result.tokenType !== "Bearer"
  ) {
    throw new Error("Invalid authentication response.");
  }

  api.defaults.headers.common.Authorization = "Bearer " + result.accessToken;
  const response = await api.get("/auth/me");
  if (revision !== expectedRevision) return;
  const user = response.data?.data;

  if (
    typeof user?.id !== "string" ||
    typeof user.email !== "string" ||
    !["GUEST", "ADMIN", "MANAGER", "RECEPTIONIST"].includes(user.role)
  ) {
    throw new Error("Invalid account response.");
  }

  lastVerified = Date.now();
  publish("authenticated", user);
}

export function restoreGuestSession({ ifStale = false } = {}) {
  if (logoutOperation) return logoutOperation;
  if (session.status === "logout-error") return signOutGuest();
  if (operation) return operation;
  if (ifStale && Date.now() - lastVerified < 60_000) {
    return Promise.resolve();
  }

  const expectedRevision = revision;
  operation = (async () => {
    try {
      const response = await cookieRequest("/auth/refresh");
      await identify(response.data?.data, expectedRevision);
    } catch (error) {
      if (revision !== expectedRevision) return;
      clearToken();
      if (error.response?.status === 401) {
        publish("anonymous");
      } else {
        publish("error", null, "Your session could not be checked. Please retry.");
      }
    } finally {
      operation = null;
    }
  })();
  return operation;
}

export function signInGuest(email, password) {
  if (logoutOperation) return logoutOperation;
  if (operation) return operation;

  const expectedRevision = ++revision;
  clearToken();
  publish("loading");

  operation = (async () => {
    try {
      const response = await cookieRequest("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await identify(response.data?.data, expectedRevision);
    } catch (error) {
      if (revision !== expectedRevision) return;
      clearToken();
      publish("anonymous", null, guestAuthError(error));
    } finally {
      operation = null;
    }
  })();
  return operation;
}

export function signOutGuest() {
  if (logoutOperation) return logoutOperation;
  ++revision;
  const pending = operation;
  clearToken();
  publish("loading");

  logoutOperation = (async () => {
    await pending;
    try {
      await cookieRequest("/auth/logout");
      publish("anonymous", null, "You have signed out.");
    } catch {
      publish("logout-error", null, "Server sign-out could not be confirmed. Please retry.");
    } finally {
      clearToken();
      logoutOperation = null;
    }
  })();
  return logoutOperation;
}

export async function registerGuest(input) {
  const response = await api.post("/auth/register", input, { timeout: 30_000 });
  if (typeof response.data?.message !== "string") {
    throw new Error("Invalid registration response.");
  }
  return response.data;
}

export async function verifyGuestEmail(token) {
  const response = await api.get("/auth/verify-email", { params: { token } });
  if (typeof response.data?.message !== "string") {
    throw new Error("Invalid verification response.");
  }
  return response.data;
}

export async function resendGuestVerification(email) {
  const response = await api.post(
    "/auth/resend-verification",
    { email: email.trim().toLowerCase() },
    { timeout: 30_000 },
  );
  if (typeof response.data?.message !== "string") {
    throw new Error("Invalid verification response.");
  }
  return response.data;
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
      publish("anonymous", null, "Your session ended. Please sign in again.");
    }
    return Promise.reject(error);
  },
);
