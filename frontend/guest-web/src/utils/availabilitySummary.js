import { staySearchParams } from "./staySearch.js";

export function availabilitySummary(results, query) {
  const availableCount = results.filter((room) => room.available).length;

  const checkoutSearch = staySearchParams(query);

  return { availableCount, checkoutSearch };
}
