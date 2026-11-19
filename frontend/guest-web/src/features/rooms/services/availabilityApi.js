import { rentalSelection } from "../../../shared/utils/rentalStay.js";
import { validateResults } from "../utils/validateAvailabilityResults.js";

import { api } from "../../../shared/services/api.js";

/**
 * Search room availability using the existing backend.
 * The backend determines availability and calculates prices.
 */
export async function searchAvailability(
  selection,
  signal,
) {
  const response = await api.get("/availability", {
    params: {
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      guests: selection.guests,
      ...rentalSelection(selection),
    },
    signal,
  });

  const results = response.data?.data;

  if (!Array.isArray(results)) {
    throw new Error("Invalid availability response.");
  }

  return validateResults(results, selection);
}
