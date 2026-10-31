
import { api } from "./api.js";

/**
 * Search room availability using the existing backend.
 * The backend determines availability and calculates prices.
 */
export async function searchAvailability(
  { checkIn, checkOut, guests },
  signal,
) {
  const response = await api.get("/availability", {
    params: {
      checkIn,
      checkOut,
      guests,
    },
    signal,
  });

  const results = response.data?.data;

  if (!Array.isArray(results)) {
    throw new Error("Invalid availability response.");
  }

  return results;
}
