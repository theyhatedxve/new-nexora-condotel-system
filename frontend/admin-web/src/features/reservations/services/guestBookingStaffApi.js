import api from "../../../shared/services/api.js";

const POLICY = "guest-booking-v2";

function validDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

function nullableDate(value) {
  return value === null || validDate(value);
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 200
  );
}

export function hasGuestBookingPolicyFields(booking) {
  if (!booking || typeof booking !== "object") {
    return false;
  }

  return (
    (
      booking.bookingPolicyVersion === null ||
      typeof booking.bookingPolicyVersion === "string"
    ) &&
    (
      booking.paymentPreference === null ||
      ["PAY_AT_PROPERTY", "PAYMONGO"].includes(
        booking.paymentPreference,
      )
    ) &&
    nullableDate(booking.expectedArrivalAt) &&
    nullableDate(booking.firstContactedAt) &&
    nullableDate(booking.responseDeadlineAt) &&
    nullableDate(booking.confirmedAt) &&
    nullableDate(booking.holdExpiresAt)
  );
}

export function isPropertyBookingRequest(booking) {
  return (
    hasGuestBookingPolicyFields(booking) &&
    booking.bookingPolicyVersion === POLICY &&
    booking.paymentPreference === "PAY_AT_PROPERTY"
  );
}

function actionInput(booking, action) {
  if (
    !isPropertyBookingRequest(booking) ||
    !validId(booking.id) ||
    typeof booking.reservationNumber !== "string" ||
    !booking.reservationNumber ||
    booking.reservationNumber.length > 100 ||
    !(booking.status === "PENDING" || (action === "contact" && booking.status === "CONFIRMED"))
  ) {
    throw new Error(
      "Refresh the Pay at Property booking before choosing an action.",
    );
  }

  return {
    id: booking.id,
    reference: booking.reservationNumber,
  };
}

async function performAction(
  booking,
  action,
  body,
  expectedStatus,
) {
  const identity = actionInput(booking, action);

  const response = await api.post(
    "/reservations/" +
      encodeURIComponent(identity.id) +
      "/guest-request/" +
      action,
    body,
  );

  const result = response.data?.data;

  if (
    !result ||
    result.id !== identity.id ||
    result.reservationNumber !== identity.reference ||
    result.paymentPreference !== "PAY_AT_PROPERTY" ||
    result.status !== expectedStatus ||
    !validDate(result.expectedArrivalAt) ||
    !nullableDate(result.firstContactedAt) ||
    !nullableDate(result.responseDeadlineAt) ||
    !nullableDate(result.confirmedAt) ||
    !nullableDate(result.holdExpiresAt)
  ) {
    const error = new Error(
      "The action response could not be verified. Refresh the booking before trying another action.",
    );

    error.outcomeUnknown = true;
    throw error;
  }

  return result;
}

export function recordGuestContact(booking, channel) {
  if (!["PHONE", "EMAIL"].includes(channel)) {
    throw new Error("Choose phone or email contact.");
  }

  return performAction(
    booking,
    "contact",
    { channel },
    booking.status,
  );
}

export function confirmGuestBooking(booking, guestAgreed) {
  if (guestAgreed !== true) {
    throw new Error(
      "Record the guest’s agreement before confirming.",
    );
  }

  return performAction(
    booking,
    "confirm",
    { guestAgreed: true },
    "CONFIRMED",
  );
}

export function rejectGuestBooking(booking, reason) {
  const cleanedReason =
    typeof reason === "string" ? reason.trim() : "";

  if (cleanedReason.length < 3 || cleanedReason.length > 500) {
    throw new Error(
      "Enter a rejection reason of 3–500 characters.",
    );
  }

  return performAction(
    booking,
    "reject",
    { reason: cleanedReason },
    "CANCELLED",
  );
}
