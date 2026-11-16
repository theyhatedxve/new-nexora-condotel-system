import { readRental, rentalWindow } from "./rentalStay.js";
import { stayNights } from "./staySearch.js";

export function validateResults(results, query) {
  const expectedNights = stayNights(query.checkIn, query.checkOut);

  const ids = new Set();

  for (const result of results) {
    if (
      !result ||
      typeof result.id !== "string" ||
      !result.id ||
      typeof result.name !== "string" ||
      !result.name ||
      typeof result.available !== "boolean" ||
      !Number.isSafeInteger(result.capacity) ||
      result.capacity < 1 ||
      !Number.isSafeInteger(result.nightlyRateCentavos) ||
      result.nightlyRateCentavos < 0 ||
      !Number.isSafeInteger(result.totalAmountCentavos) ||
      result.totalAmountCentavos < 0 ||
      (!query.rentalType && result.nights !== expectedNights) ||
      ids.has(result.id)
    ) {
      throw new Error("Invalid availability response.");
    }

    if (query.rentalType) {
      const rental = readRental(result);
      const window = rentalWindow(query);
      if (!rental || rental.rentalType !== query.rentalType ||
          rental.rentalUnits !== query.rentalUnits || result.guests !== query.guests ||
          rental.scheduledArrivalAt !== window.start || rental.scheduledDepartureAt !== window.end ||
          rental.includedOccupancy > result.capacity || query.guests > result.capacity ||
          result.extraPersonTotalCentavos !==
            Math.max(0, query.guests - rental.includedOccupancy) *
            rental.extraPersonFeeCentavos * rental.rentalUnits ||
          result.inventoryChecked !== true) {
        throw new Error("Invalid availability response.");
      }
    }
    ids.add(result.id);
  }

  return results;
}
