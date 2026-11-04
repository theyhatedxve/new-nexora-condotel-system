const STORAGE_KEY = "nexora.guest-booking.v2";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedAttempt(value, apiScope) {
  const selection = value?.selection;

  if (
    value?.version !== 1 ||
    value.apiScope !== apiScope ||
    !UUID.test(value.requestId || "") ||
    !UUID.test(value.checkoutRequestId || "") ||
    !/^[a-f0-9]{64}$/.test(
      value.recoveryToken || "",
    ) ||
    !["PAY_AT_PROPERTY", "PAYMONGO"].includes(
      value.paymentPreference,
    ) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      value.arrivalTime || "",
    ) ||
    !selection ||
    typeof selection.roomTypeId !== "string" ||
    selection.roomTypeId.length < 1 ||
    selection.roomTypeId.length > 100 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      selection.checkIn || "",
    ) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      selection.checkOut || "",
    ) ||
    !Number.isSafeInteger(selection.guests) ||
    selection.guests < 1 ||
    selection.guests > 2147483647 ||
    (
      value.reservationNumber !== undefined &&
      (
        typeof value.reservationNumber !== "string" ||
        value.reservationNumber.length < 1 ||
        value.reservationNumber.length > 100
      )
    )
  ) {
    throw new Error(
      "Stored booking recovery is unavailable or belongs to another backend.",
    );
  }

  return {
    version: 1,
    apiScope,
    requestId: value.requestId,
    checkoutRequestId: value.checkoutRequestId,
    recoveryToken: value.recoveryToken,
    paymentPreference: value.paymentPreference,
    arrivalTime: value.arrivalTime,
    selection: {
      roomTypeId: selection.roomTypeId,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      guests: selection.guests,
    },
    ...(value.reservationNumber
      ? {
          reservationNumber:
            value.reservationNumber,
        }
      : {}),
  };
}

export function loadBookingAttempt(apiScope) {
  const raw =
    window.sessionStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  if (raw.length > 4000) {
    throw new Error(
      "Stored booking recovery requires assistance.",
    );
  }

  return normalizedAttempt(
    JSON.parse(raw),
    apiScope,
  );
}

export function saveBookingAttempt(
  value,
  apiScope,
) {
  const attempt = normalizedAttempt(
    value,
    apiScope,
  );

  const existing =
    loadBookingAttempt(apiScope);

  if (
    existing &&
    existing.requestId !== attempt.requestId
  ) {
    throw new Error(
      "Recover the existing booking first.",
    );
  }

  const serialized =
    JSON.stringify(attempt);

  window.sessionStorage.setItem(
    STORAGE_KEY,
    serialized,
  );

  if (
    window.sessionStorage.getItem(STORAGE_KEY) !==
    serialized
  ) {
    throw new Error(
      "Booking recovery could not be saved.",
    );
  }

  return attempt;
}

export function newBookingAttempt(
  selection,
  paymentPreference,
  arrivalTime,
  apiScope,
) {
  if (loadBookingAttempt(apiScope)) {
    throw new Error(
      "Recover the existing booking first.",
    );
  }

  const bytes = crypto.getRandomValues(
    new Uint8Array(32),
  );

  const recoveryToken = Array.from(
    bytes,
    (value) =>
      value.toString(16).padStart(2, "0"),
  ).join("");

  return saveBookingAttempt(
    {
      version: 1,
      apiScope,
      requestId: crypto.randomUUID(),
      checkoutRequestId: crypto.randomUUID(),
      recoveryToken,
      selection,
      paymentPreference,
      arrivalTime,
    },
    apiScope,
  );
}

export function clearBookingAttempt(
  apiScope,
  requestId,
) {
  const existing =
    loadBookingAttempt(apiScope);

  if (
    existing &&
    existing.requestId !== requestId
  ) {
    throw new Error(
      "Another booking request is active.",
    );
  }

  window.sessionStorage.removeItem(
    STORAGE_KEY,
  );

  if (
    window.sessionStorage.getItem(STORAGE_KEY) !==
    null
  ) {
    throw new Error(
      "Booking recovery could not be cleared.",
    );
  }
}