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

function validReservationItem(item) {
  return (
    item &&
    typeof item.id === "string" &&
    RESERVATION_ID_PATTERN.test(item.id) &&
    typeof item.reservationNumber === "string" &&
    item.reservationNumber.length > 0 &&
    reservationStatuses.has(item.status) &&
    typeof item.roomType?.name === "string" &&
    typeof item.checkInDate === "string" &&
    typeof item.checkOutDate === "string" &&
    Number.isSafeInteger(item.guestCount) &&
    item.guestCount >= 1 &&
    Number.isSafeInteger(item.nightlyRateCentavos) &&
    item.nightlyRateCentavos >= 1 &&
    Number.isSafeInteger(item.totalAmountCentavos) &&
    item.totalAmountCentavos >= 1
  );
}

/**
 * Fetches a paginated list of reservations owned by the signed-in guest.
 */
export async function getMyBookings(page = 1, limit = 20, signal) {
  const response = await api.get("/guest/reservations", {
    params: { page, limit },
    withCredentials: true,
    signal,
  });

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.items.every(validReservationItem) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    !Number.isSafeInteger(data.page) ||
    data.page < 1 ||
    !Number.isSafeInteger(data.limit) ||
    data.limit < 1 ||
    !Number.isSafeInteger(data.totalPages) ||
    data.totalPages < 0
  ) {
    throw new Error("The reservations list could not be verified.");
  }

  return data;
}

/**
 * Fetches a single reservation owned by the signed-in guest using its ID.
 */
export async function getMyBookingById(reservationId, signal) {
  if (
    typeof reservationId !== "string" ||
    !RESERVATION_ID_PATTERN.test(reservationId)
  ) {
    throw new Error("A valid reservation ID is required.");
  }

  const response = await api.get(
    "/guest/reservations/" + encodeURIComponent(reservationId),
    {
      withCredentials: true,
      signal,
    },
  );

  const data = response.data?.data;

  if (!validReservationItem(data) || data.id !== reservationId) {
    throw new Error("The reservation response could not be verified.");
  }

  return data;
}
