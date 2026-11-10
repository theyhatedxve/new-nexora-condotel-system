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
      result.nights !== expectedNights ||
      ids.has(result.id)
    ) {
      throw new Error("Invalid availability response.");
    }

    ids.add(result.id);
  }

  return results;
}
