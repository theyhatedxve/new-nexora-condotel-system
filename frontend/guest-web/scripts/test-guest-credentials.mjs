// Exercise the real client services with an Axios adapter; no browser, server,
// SMTP, user account, or development database is accessed.
import assert from "node:assert/strict";
import { createServer } from "vite";

const previousWindow = globalThis.window;
globalThis.window = { location: { origin: "http://localhost:5175" } };
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", mode: "test" });
try {
  const { api } = await vite.ssrLoadModule("/src/shared/services/api.js");
  const auth = await vite.ssrLoadModule("/src/features/auth/services/guestAuthApi.js");
  const credentials = await vite.ssrLoadModule("/src/features/auth/services/guestCredentialsApi.js");
  const calls = [];
  let rejectPassword = false;
  api.defaults.adapter = async (config) => {
    calls.push(config);
    if (rejectPassword && config.url === "/auth/guest/password") {
      throw Object.assign(new Error("Synthetic form error"), { config, response: { status: 400, data: { message: "The current password is incorrect." } } });
    }
    let data = { data: { signInAgain: true } };
    if (config.url === "/auth/guest/login") data = { data: { accessToken: "synthetic-token", tokenType: "Bearer" } };
    if (config.url === "/auth/me") data = { data: { id: "synthetic-guest", email: "guest@example.invalid", role: "GUEST" } };
    if (["/auth/guest/email", "/auth/guest/forgot-password"].includes(config.url)) data = { message: "Synthetic acknowledgment" };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  await auth.signInGuest("guest@example.invalid", "Synthetic-Current-Password-123!");
  assert.equal(auth.getGuestSession().status, "authenticated");
  await credentials.requestGuestEmailChange({ email: "new@example.invalid", currentPassword: "synthetic" });
  assert.equal(calls.at(-1).timeout, 30_000);
  assert.equal(auth.getGuestSession().status, "authenticated", "email request must retain current session until confirmation");

  rejectPassword = true;
  await assert.rejects(credentials.changeGuestPassword({}), /Synthetic form error/);
  assert.equal(auth.getGuestSession().status, "authenticated", "a recoverable password error must retain the session");
  rejectPassword = false;
  await credentials.changeGuestPassword({ currentPassword: "synthetic", newPassword: "replacement", confirmPassword: "replacement" });
  assert.equal(auth.getGuestSession().status, "anonymous");
  assert.equal(api.defaults.headers.common.Authorization, undefined);
  assert.match(auth.getGuestSession().message, /password changed/);

  await auth.signInGuest("guest@example.invalid", "Synthetic-Current-Password-123!");
  await credentials.confirmGuestEmail({ token: "a".repeat(64) });
  assert.equal(auth.getGuestSession().status, "anonymous");
  assert.match(auth.getGuestSession().message, /email changed/);
  await credentials.resetGuestPassword({ token: "b".repeat(64), newPassword: "synthetic", confirmPassword: "synthetic" });
  assert.match(auth.getGuestSession().message, /password has been reset/);
  assert.equal(await credentials.requestGuestPasswordReset({ email: "guest@example.invalid" }), "Synthetic acknowledgment");
  assert.equal(calls.at(-1).timeout, 30_000);
  assert.equal(credentials.guestCredentialError({ response: { status: 429 } }), "Too many attempts. Please wait one minute before trying again.");
  console.log("Guest credential client checks passed: request timeout, session preservation on failure, password/email/reset sign-out, recovery acknowledgment, and rate-limit feedback.");
} finally {
  await vite.close();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
