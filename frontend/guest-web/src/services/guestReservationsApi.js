import { api } from "./api.js";

const BASE_PATH = "/guest/reservations";

function validateBooking(booking) {
  if (
    typeof booking?.id !== "string" ||
    typeof booking.reservationNumber !== "string" ||
    typeof booking.status !== "string" ||
    typeof booking.roomType?.name !== "string" ||
    typeof booking.checkInDate !== "string" ||
    typeof booking.checkOutDate !== "string" ||
    !Number.isSafeInteger(booking.totalAmountCentavos)
  ) {
    throw new Error("The booking response could not be verified.");
  }
  return booking;
}

export async function listMyBookings(page, signal) {
  const response = await api.get(BASE_PATH, {
    params: { page, limit: 20 },
    signal,
  });
  const data = response.data?.data;
  if (
    !Array.isArray(data?.items) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    !Number.isSafeInteger(data.page) ||
    data.page < 1 ||
    data.limit !== 20 ||
    !Number.isSafeInteger(data.totalPages) ||
    data.totalPages < 0
  ) {
    throw new Error("The booking list could not be verified.");
  }
  return { ...data, items: data.items.map(validateBooking) };
}

export async function getMyBookingById(id, signal) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error("The booking ID is invalid.");
  }
  const response = await api.get(
    `${BASE_PATH}/${encodeURIComponent(id)}`,
    { signal },
  );
  const booking = validateBooking(response.data?.data);
  if (booking.id !== id) {
    throw new Error("The booking response does not match.");
  }
  return booking;
}
