import {
  loadBookingAttempt,
} from "./bookingAttempt.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getBookingApiScope() {
  return new URL(
    import.meta.env.VITE_API_URL || "/",
    window.location.origin,
  ).href;
}

export function bookingReferenceFromSearch(
  search,
) {
  if (
    typeof search !== "string" ||
    search.length > 1024
  ) {
    throw new Error(
      "The booking context is invalid.",
    );
  }

  const params = new URLSearchParams(search);
  const values = params.getAll("booking");

  if (values.length === 0) {
    return null;
  }

  if (
    values.length !== 1 ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(
      values[0],
    )
  ) {
    throw new Error(
      "The booking context is invalid.",
    );
  }

  return values[0];
}

export function checkoutRequestIdFor(
  reservationNumber,
  apiScope = getBookingApiScope(),
) {
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(
      reservationNumber,
    )
  ) {
    throw new Error(
      "The booking reference is invalid.",
    );
  }

  const attempt =
    loadBookingAttempt(apiScope);

  if (
    attempt?.reservationNumber ===
    reservationNumber
  ) {
    return attempt.checkoutRequestId;
  }

  const key =
    "nexora.checkout-request.v1:" +
    encodeURIComponent(apiScope) +
    ":" +
    reservationNumber;

  const existing =
    window.sessionStorage.getItem(key);

  if (existing !== null) {
    if (!UUID.test(existing)) {
      throw new Error(
        "The original checkout request requires review.",
      );
    }

    return existing;
  }

  const requestId = crypto.randomUUID();

  window.sessionStorage.setItem(
    key,
    requestId,
  );

  if (
    window.sessionStorage.getItem(key) !==
    requestId
  ) {
    throw new Error(
      "The checkout request could not be retained.",
    );
  }

  return requestId;
}