export const RENTAL_TYPES = [
  { value: "HOURLY", label: "Hourly", unit: "hour" },
  { value: "NIGHTLY", label: "Nightly", unit: "night" },
  { value: "WEEKLY", label: "Weekly", unit: "week" },
  { value: "MONTHLY", label: "Monthly", unit: "month" },
];

const MAXIMUM = 2_147_483_647;

function validMoney(value, minimum) {
  return (
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= MAXIMUM
  );
}

export function parsePricingPesos(value, allowZero = false) {
  if (typeof value !== "string") {
    throw new Error("Enter an amount in pesos.");
  }

  const text = value.trim();

  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text)) {
    throw new Error(
      "Enter pesos without commas, using up to two decimal places.",
    );
  }

  const [whole, fraction = ""] = text.split(".");
  const centavos =
    Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!validMoney(centavos, allowZero ? 0 : 1)) {
    throw new Error(
      allowZero
        ? "Amount must be between PHP 0.00 and PHP 21,474,836.47."
        : "Rate must be between PHP 0.01 and PHP 21,474,836.47.",
    );
  }

  return centavos;
}

function pesosInput(centavos) {
  return (
    Math.floor(centavos / 100) +
    "." +
    String(centavos % 100).padStart(2, "0")
  );
}

export function validateRentalPricing(value, expectedId) {
  if (
    !value ||
    value.id !== expectedId ||
    typeof value.name !== "string" ||
    !Number.isSafeInteger(value.capacity) ||
    value.capacity < 1 ||
    value.capacity > MAXIMUM ||
    !Number.isSafeInteger(value.includedOccupancy) ||
    value.includedOccupancy < 1 ||
    value.includedOccupancy > value.capacity ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !Array.isArray(value.rates) ||
    value.rates.length > RENTAL_TYPES.length
  ) {
    throw new Error("The pricing response could not be verified.");
  }

  const seen = new Set();

  for (const rate of value.rates) {
    if (
      !rate ||
      !RENTAL_TYPES.some((item) => item.value === rate.rentalType) ||
      seen.has(rate.rentalType) ||
      !validMoney(rate.rateCentavos, 1) ||
      !validMoney(rate.extraPersonFeeCentavos, 0) ||
      typeof rate.isActive !== "boolean"
    ) {
      throw new Error("The saved rental rates require review.");
    }

    seen.add(rate.rentalType);
  }

  return value;
}

export function createPricingDraft(pricing) {
  return {
    includedOccupancy: String(pricing.includedOccupancy),
    rates: RENTAL_TYPES.map(({ value }) => {
      const saved = pricing.rates.find(
        (rate) => rate.rentalType === value,
      );

      return {
        rentalType: value,
        price: saved ? pesosInput(saved.rateCentavos) : "",
        extraFee: saved
          ? pesosInput(saved.extraPersonFeeCentavos)
          : "0.00",
        isActive:
          value === "NIGHTLY" ? true : saved?.isActive ?? false,
      };
    }),
  };
}

export function createPricingRequest(pricing, draft) {
  if (!/^\d{1,10}$/.test(draft.includedOccupancy.trim())) {
    throw new Error("Included guests must be a whole number.");
  }

  const includedOccupancy = Number(draft.includedOccupancy);

  if (
    !Number.isSafeInteger(includedOccupancy) ||
    includedOccupancy < 1 ||
    includedOccupancy > pricing.capacity
  ) {
    throw new Error(
      `Included guests must be between 1 and ${pricing.capacity}.`,
    );
  }

  if (
    !Array.isArray(draft.rates) ||
    draft.rates.length !== RENTAL_TYPES.length
  ) {
    throw new Error("Provide all four rental rates.");
  }

  const rates = RENTAL_TYPES.map(({ value, label }) => {
    const matching = draft.rates.filter(
      (rate) => rate.rentalType === value,
    );

    if (
      matching.length !== 1 ||
      typeof matching[0].isActive !== "boolean"
    ) {
      throw new Error(`Review the ${label.toLowerCase()} rate.`);
    }

    const rate = matching[0];

    if (value === "NIGHTLY" && !rate.isActive) {
      throw new Error("Nightly pricing must remain enabled.");
    }

    try {
      return {
        rentalType: value,
        rateCentavos: parsePricingPesos(rate.price),
        extraPersonFeeCentavos: parsePricingPesos(
          rate.extraFee,
          true,
        ),
        isActive: rate.isActive,
      };
    } catch (error) {
      throw new Error(`${label}: ${error.message}`);
    }
  });

  return {
    updatedAt: pricing.updatedAt,
    includedOccupancy,
    rates,
  };
}
