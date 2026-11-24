import { endGuestCredentialSession, guestCredentialRequest } from "./guestAuthApi.js";

export async function changeGuestPassword(input) {
  await guestCredentialRequest("/auth/guest/password", input);
  endGuestCredentialSession("Your password changed. Please sign in with your new password.");
}

export async function requestGuestEmailChange(input) {
  const response = await guestCredentialRequest("/auth/guest/email", input);
  return response.data.message;
}

export async function requestGuestPasswordReset(input) {
  const response = await guestCredentialRequest("/auth/guest/forgot-password", input);
  return response.data.message;
}

export async function resetGuestPassword(input) {
  await guestCredentialRequest("/auth/guest/reset-password", input);
  const message = "Your password has been reset. Please sign in with your new password.";
  endGuestCredentialSession(message);
  return message;
}

export async function confirmGuestEmail(input) {
  await guestCredentialRequest("/auth/guest/confirm-email", input);
  const message = "Your sign-in email changed. Please sign in with your new email address.";
  endGuestCredentialSession(message);
  return message;
}

export function guestCredentialError(error) {
  const status = error.response?.status;
  if (status === 429) return "Too many attempts. Please wait one minute before trying again.";
  if (status === 401) return "Your session ended. Sign in again to continue.";
  const message = error.response?.data?.message;
  if ([400, 403, 409].includes(status) && typeof message === "string") return message;
  if (status === 400) return "Check your email and password fields. New passwords must match and contain 12–128 characters.";
  return "The request could not be confirmed. Check your connection. If a change may have completed, try signing in before requesting a new link.";
}
