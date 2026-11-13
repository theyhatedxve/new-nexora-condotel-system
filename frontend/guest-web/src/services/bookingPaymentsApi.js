import { api } from "./api.js";

const RESERVATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const reservationStatuses = new Set([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
]);

const paymentStatuses = new Set([
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
  "REVIEW_REQUIRED",
]);

function requireReservationId(reservationId) {
  if (
    typeof reservationId !== "string" ||
    !RESERVATION_ID_PATTERN.test(reservationId)
  ) {
    throw new Error("A valid reservation ID is required.");
  }
}

function validCheckoutUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "checkout.paymongo.com" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.pathname !== "/"
    );
  } catch {
    return false;
  }
}

function readCheckout(response) {
  const result = response.data?.data;

  if (
    !result ||
    !["NONE", "CREATING", "READY", "UNKNOWN", "PAID"].includes(result.state) ||
    !Number.isSafeInteger(result.amountCentavos) ||
    result.amountCentavos < 0 ||
    (result.state === "READY" &&
      (result.amountCentavos < 1 || !validCheckoutUrl(result.checkoutUrl))) ||
    (result.state !== "READY" && result.checkoutUrl !== null)
  ) {
    throw new Error(
      "The payment attempt could not be verified. Check the existing attempt.",
    );
  }

  return {
    state: result.state,
    amountCentavos: result.amountCentavos,
    checkoutUrl: result.checkoutUrl,
  };
}

function readPaymentSummary(response, expectedReservationNumber) {
  const result = response.data?.data;

  if (
    !result ||
    (expectedReservationNumber &&
      result.reservationNumber !== expectedReservationNumber) ||
    !reservationStatuses.has(result.reservationStatus) ||
    !paymentStatuses.has(result.status) ||
    result.currency !== "PHP" ||
    typeof result.requiresReview !== "boolean" ||
    !Number.isSafeInteger(result.netPaidCentavos) ||
    result.netPaidCentavos < 0 ||
    (result.balanceDueCentavos !== null &&
      (!Number.isSafeInteger(result.balanceDueCentavos) ||
        result.balanceDueCentavos < 0))
  ) {
    throw new Error("The payment summary does not match this booking.");
  }

  return result;
}

export async function getReservationPaymentSummary(
  reservationId,
  expectedReservationNumber,
  signal,
) {
  requireReservationId(reservationId);
  const response = await api.get(
    `/payments/reservations/${encodeURIComponent(reservationId)}/summary`,
    { withCredentials: true, signal },
  );
  return readPaymentSummary(response, expectedReservationNumber);
}

export async function getReservationCheckout(reservationId, signal) {
  requireReservationId(reservationId);
  const response = await api.get(
    `/payments/reservations/${encodeURIComponent(reservationId)}/checkout`,
    { withCredentials: true, signal },
  );
  return readCheckout(response);
}

export async function startReservationCheckout({ reservationId, requestId }) {
  requireReservationId(reservationId);
  const response = await api.post(
    `/payments/reservations/${encodeURIComponent(reservationId)}/checkout`,
    { requestId },
    { withCredentials: true, timeout: 60_000 },
  );
  return readCheckout(response);
}
