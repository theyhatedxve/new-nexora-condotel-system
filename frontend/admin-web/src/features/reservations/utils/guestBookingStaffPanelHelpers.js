export function failureMessage(error) {
  const status = error.response?.status;

  if (status === 401) {
    return "Your staff session ended. Sign in again before continuing.";
  }
  if (status === 403) {
    return "Your current account cannot perform this action.";
  }
  if (status === 404) {
    return "The reservation is unavailable. Refresh the reservation list.";
  }
  if (status === 409) {
    return "The request cannot proceed in its current state. Details have been refreshed; check its status, deadlines, and payment records.";
  }
  if (status === 400) {
    return "The action was rejected. Refresh the booking and check the required information.";
  }
  if (status === 429) {
    return "Too many requests. Wait before checking the updated booking.";
  }
  return "The result could not be confirmed. Details have been refreshed. Check the booking before repeating any action.";
}
