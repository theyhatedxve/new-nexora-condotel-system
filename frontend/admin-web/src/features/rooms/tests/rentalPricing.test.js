import test from "node:test";
import assert from "node:assert/strict";

import {
  RENTAL_TYPES,
  createPricingDraft,
  createPricingRequest,
  parsePricingPesos,
  validateRentalPricing,
} from "../utils/rentalPricing.js";

function pricing() {
  return {
    id: "room-type-1",
    name: "Deluxe",
    capacity: 3,
    includedOccupancy: 2,
    updatedAt: "2026-11-19T00:00:00.000Z",
    rates: RENTAL_TYPES.map(({ value }) => ({
      rentalType: value,
      rateCentavos: 300000,
      extraPersonFeeCentavos: 0,
      isActive: true,
    })),
  };
}

test("converts PHP decimals into exact integer centavos", () => {
  assert.equal(parsePricingPesos("3000.25"), 300025);
  assert.equal(parsePricingPesos("0.01"), 1);
  assert.equal(parsePricingPesos("0", true), 0);
});

test("rejects invalid, rounded, negative and excessive amounts", () => {
  for (const value of [
    "",
    "-1",
    "1.001",
    "3,000",
    "1e3",
    "21474836.48",
  ]) {
    assert.throws(() => parsePricingPesos(value));
  }

  assert.throws(() => parsePricingPesos("0"));
});

test("leaves missing optional rates blank and disabled", () => {
  const saved = pricing();
  saved.rates = saved.rates.filter(
    (rate) => rate.rentalType === "NIGHTLY",
  );

  const draft = createPricingDraft(saved);

  assert.equal(draft.rates[0].price, "");
  assert.equal(draft.rates[0].isActive, false);
  assert.throws(() => createPricingRequest(saved, draft));
});

test("includes all four reviewed rates and the loaded version", () => {
  const saved = pricing();
  const draft = createPricingDraft(saved);

  draft.rates[0].price = "450.50";
  draft.rates[0].extraFee = "50.25";
  draft.rates[0].isActive = false;

  const request = createPricingRequest(saved, draft);

  assert.equal(request.updatedAt, saved.updatedAt);
  assert.equal(request.rates.length, 4);
  assert.equal(request.rates[0].rateCentavos, 45050);
  assert.equal(request.rates[0].extraPersonFeeCentavos, 5025);
  assert.equal(request.rates[0].isActive, false);
});

test("rejects occupancy above capacity and fractional occupancy", () => {
  const saved = pricing();

  for (const value of ["0", "4", "1.5"]) {
    const draft = createPricingDraft(saved);
    draft.includedOccupancy = value;
    assert.throws(() => createPricingRequest(saved, draft));
  }
});

test("rejects disabled nightly pricing and duplicate rental types", () => {
  const saved = pricing();
  const draft = createPricingDraft(saved);

  draft.rates[1].isActive = false;
  assert.throws(() => createPricingRequest(saved, draft));

  const duplicate = pricing();
  duplicate.rates[0].rentalType = "NIGHTLY";

  assert.throws(() =>
    validateRentalPricing(duplicate, duplicate.id),
  );
});
