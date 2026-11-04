import { api } from "./api.js";

export async function createPayAtPropertyReservation(input) {
  // Booking requests must not be retried automatically.
  const response = await api.post(
    "/reservations/pay-at-property",
    input,
    {
      timeout: 60_000,
    },
  );

  const result = response.data?.data;

  if (
    !result ||
    typeof result.reservationNumber !== "string" ||
    result.status !== "CONFIRMED" ||
    !Number.isSafeInteger(result.nightlyRateCentavos) ||
    result.nightlyRateCentavos < 1 ||
    !Number.isSafeInteger(result.totalAmountCentavos) ||
    result.totalAmountCentavos < 1
  ) {
    throw new Error(
      "The booking result could not be verified.",
    );
  }

  return result;
}