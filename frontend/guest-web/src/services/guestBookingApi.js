import {
  api,
} from "./api.js";

import {
  getBookingPaymentSummary,
} from "./bookingPaymentsApi.js";

const BOOKING_PATH =
  "/reservations/access/guest-bookings";

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

function validDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

function nullableDate(value) {
  return value === null || validDate(value);
}

function requireReference(value) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 100 ||
    value !== value.trim()
  ) {
    throw new Error(
      "The booking reference could not be verified.",
    );
  }
}

function readReceipt(response, requestId) {
  const result = response.data?.data;

  if (
    !result ||
    result.requestId !== requestId ||
    !reservationStatuses.has(result.status) ||
    ![
      "PAY_AT_PROPERTY",
      "PAYMONGO",
    ].includes(result.paymentPreference) ||
    !validDate(result.expectedArrivalAt) ||
    !nullableDate(result.holdExpiresAt) ||
    !nullableDate(result.firstContactedAt) ||
    !nullableDate(result.responseDeadlineAt) ||
    !validDate(result.sessionExpiresAt) ||
    typeof result.replayed !== "boolean" ||
    typeof result.holdExpired !== "boolean" ||
    !Number.isSafeInteger(
      result.nightlyRateCentavos,
    ) ||
    result.nightlyRateCentavos < 1 ||
    !Number.isSafeInteger(
      result.totalAmountCentavos,
    ) ||
    result.totalAmountCentavos < 1
  ) {
    throw new Error(
      "The booking result could not be verified. Recover the original request.",
    );
  }

  requireReference(
    result.reservationNumber,
  );

  return {
    requestId: result.requestId,
    reservationNumber:
      result.reservationNumber,
    status: result.status,
    paymentPreference:
      result.paymentPreference,
    expectedArrivalAt:
      result.expectedArrivalAt,
    holdExpiresAt:
      result.holdExpiresAt,
    firstContactedAt:
      result.firstContactedAt,
    responseDeadlineAt:
      result.responseDeadlineAt,
    sessionExpiresAt:
      result.sessionExpiresAt,
    nightlyRateCentavos:
      result.nightlyRateCentavos,
    totalAmountCentavos:
      result.totalAmountCentavos,
    holdExpired:
      result.holdExpired,
    replayed:
      result.replayed,
  };
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
    ![
      "NONE",
      "CREATING",
      "READY",
      "UNKNOWN",
      "PAID",
    ].includes(result.state) ||
    !Number.isSafeInteger(
      result.amountCentavos,
    ) ||
    result.amountCentavos < 0 ||
    (
      result.state === "READY" &&
      (
        result.amountCentavos < 1 ||
        !validCheckoutUrl(
          result.checkoutUrl,
        )
      )
    ) ||
    (
      result.state !== "READY" &&
      result.checkoutUrl !== null
    )
  ) {
    throw new Error(
      "The payment attempt could not be verified. Check the existing attempt.",
    );
  }

  return {
    state: result.state,
    amountCentavos:
      result.amountCentavos,
    checkoutUrl:
      result.checkoutUrl,
  };
}

export async function createGuestBooking(input) {
  const response = await api.post(
    BOOKING_PATH,
    input,
    {
      withCredentials: true,
      timeout: 60_000,
    },
  );

  return readReceipt(
    response,
    input.requestId,
  );
}

export async function recoverGuestBooking({
  requestId,
  recoveryToken,
}) {
  const response = await api.post(
    BOOKING_PATH + "/recover",
    {
      requestId,
      recoveryToken,
    },
    {
      withCredentials: true,
      timeout: 60_000,
    },
  );

  return readReceipt(
    response,
    requestId,
  );
}

export async function getGuestBookingCheckout(
  expectedReservationNumber,
  signal,
) {
  requireReference(
    expectedReservationNumber,
  );

  const response = await api.post(
    BOOKING_PATH + "/checkout/current",
    {
      expectedReservationNumber,
    },
    {
      withCredentials: true,
      signal,
    },
  );

  return readCheckout(response);
}

export async function startGuestBookingCheckout({
  requestId,
  expectedReservationNumber,
}) {
  requireReference(
    expectedReservationNumber,
  );

  const response = await api.post(
    BOOKING_PATH + "/checkout",
    {
      requestId,
      expectedReservationNumber,
    },
    {
      withCredentials: true,
      timeout: 60_000,
    },
  );

  return readCheckout(response);
}

export async function getGuestBookingPaymentSummary(
  expectedReservationNumber,
  signal,
) {
  requireReference(
    expectedReservationNumber,
  );

  const result =
    await getBookingPaymentSummary(signal);

  if (
    !result ||
    result.reservationNumber !==
      expectedReservationNumber ||
    !reservationStatuses.has(
      result.reservationStatus,
    ) ||
    !paymentStatuses.has(result.status) ||
    result.currency !== "PHP" ||
    typeof result.requiresReview !==
      "boolean" ||
    !Number.isSafeInteger(
      result.netPaidCentavos,
    ) ||
    result.netPaidCentavos < 0 ||
    (
      result.balanceDueCentavos !== null &&
      (
        !Number.isSafeInteger(
          result.balanceDueCentavos,
        ) ||
        result.balanceDueCentavos < 0
      )
    )
  ) {
    throw new Error(
      "The payment summary does not match this booking.",
    );
  }

  return result;
}