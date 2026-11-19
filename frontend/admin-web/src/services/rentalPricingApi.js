import api from "./api";
import { validateRentalPricing } from "../utils/rentalPricing.js";

function pricingPath(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Choose a valid room type.");
  }

  return `/room-types/${encodeURIComponent(id)}/pricing`;
}

export async function readRentalPricing(id, signal) {
  const response = await api.get(pricingPath(id), { signal });

  return validateRentalPricing(response.data?.data, id);
}

export async function saveRentalPricing(id, input) {
  const response = await api.put(pricingPath(id), input);
  const saved = validateRentalPricing(response.data?.data, id);

  const matches =
    saved.includedOccupancy === input.includedOccupancy &&
    saved.rates.length === input.rates.length &&
    input.rates.every((requested) =>
      saved.rates.some(
        (rate) =>
          rate.rentalType === requested.rentalType &&
          rate.rateCentavos === requested.rateCentavos &&
          rate.extraPersonFeeCentavos ===
            requested.extraPersonFeeCentavos &&
          rate.isActive === requested.isActive,
      ),
    );

  if (!matches) {
    throw new Error("The response could not confirm the saved pricing.");
  }

  return saved;
}
