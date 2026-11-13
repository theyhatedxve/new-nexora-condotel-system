import { api } from "./api";

export async function getGuestProfile(signal) {
  const response = await api.get("/guest/reservations/profile", { signal });
  const profile = response.data?.data;
  if (
    typeof profile?.firstName !== "string" ||
    typeof profile.lastName !== "string" ||
    typeof profile.email !== "string"
  ) {
    throw new Error("The guest profile could not be loaded.");
  }
  return profile;
}

export async function getAccountBooking(reference, signal) {
  if (
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(reference)
  ) {
    throw new Error("Choose a booking reference.");
  }
  const response = await api.get(
    "/guest/reservations/by-reference/" + encodeURIComponent(reference),
    { signal },
  );
  const booking = response.data?.data;
  if (
    booking?.reservationNumber !== reference ||
    typeof booking.status !== "string" ||
    typeof booking.roomType?.name !== "string" ||
    typeof booking.checkInDate !== "string" ||
    typeof booking.checkOutDate !== "string"
  ) {
    throw new Error("The booking response could not be verified.");
  }
  return booking;
}
