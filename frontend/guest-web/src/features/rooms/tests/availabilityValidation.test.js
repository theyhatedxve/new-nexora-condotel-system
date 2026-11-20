import assert from "node:assert/strict";
import test from "node:test";

import { validateResults } from "../utils/validateAvailabilityResults.js";
import {
  MAX_GUESTS,
  stayNights,
  validateStaySearch,
} from "../../../shared/utils/staySearch.js";
import { formatPesos } from "../../../shared/utils/formatMoney.js";

// Fixed reference date keeps validation tests independent of today's date.
const today = "2099-01-01";

const query = {
  checkIn: "2099-01-01",
  checkOut: "2099-01-03",
  guests: 2,
};

const room = {
  id: "suite",
  name: "Deluxe Suite",
  available: true,
  capacity: 4,
  nightlyRateCentavos: 450000,
  totalAmountCentavos: 900000,
  nights: 2,
};

test("availability accepts valid server data without changing amounts or room ordering", () => {
  const results = [
    room,
    { ...room, id: "studio", available: false },
  ];

  assert.equal(validateResults(results, query), results);
  assert.deepEqual(validateResults([], query), []);

  assert.doesNotThrow(() =>
    validateResults(
      [{
        ...room,
        nightlyRateCentavos: 0,
        totalAmountCentavos: 0,
      }],
      query,
    ),
  );
});

for (const [label, patch] of [
  ["missing ID", { id: "" }],
  ["missing name", { name: "" }],
  ["non-boolean availability", { available: "true" }],
  ["zero capacity", { capacity: 0 }],
  ["fractional capacity", { capacity: 1.5 }],
  ["negative nightly rate", { nightlyRateCentavos: -1 }],
  ["fractional total", { totalAmountCentavos: 1.5 }],
  ["unsafe total", { totalAmountCentavos: Number.MAX_SAFE_INTEGER + 1 }],
  ["mismatched stay length", { nights: 3 }],
]) {
  test(`availability rejects ${label}`, () => {
    assert.throws(
      () => validateResults([{ ...room, ...patch }], query),
      { message: "Invalid availability response." },
    );
  });
}

test("availability rejects duplicate room IDs and null records", () => {
  assert.throws(() => validateResults([room, { ...room }], query));
  assert.throws(() => validateResults([null], query));
});

test("shared search accepts a valid date-range selection", () => {
  const result = validateStaySearch(query, today);

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.value, query);
});

for (const [label, patch, field, message] of [
  [
    "missing check-in",
    { checkIn: "" },
    "checkIn",
    "Select a valid check-in date.",
  ],
  [
    "missing check-out",
    { checkOut: "" },
    "checkOut",
    "Select a valid check-out date.",
  ],
  [
    "past check-in",
    { checkIn: "2098-12-31" },
    "checkIn",
    "Check-in cannot be in the past.",
  ],
  [
    "same-day date-range departure",
    { checkOut: query.checkIn },
    "checkOut",
    "Check-out must be after check-in.",
  ],
]) {
  test(`shared search rejects ${label}`, () => {
    const result = validateStaySearch(
      { ...query, ...patch },
      today,
    );

    assert.equal(result.value, null);
    assert.equal(result.errors[field], message);
  });
}

test("shared date-range search allows 30 nights and rejects 31", () => {
  const allowed = validateStaySearch(
    { ...query, checkOut: "2099-01-31" },
    today,
  );

  assert.ok(allowed.value);
  assert.deepEqual(allowed.errors, {});

  const rejected = validateStaySearch(
    { ...query, checkOut: "2099-02-01" },
    today,
  );

  assert.equal(rejected.value, null);
  assert.equal(
    rejected.errors.checkOut,
    "A stay cannot exceed 30 nights.",
  );
});

test("shared search rejects invalid guest counts", () => {
  for (const guests of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    MAX_GUESTS + 1,
  ]) {
    const result = validateStaySearch(
      { ...query, guests },
      today,
    );

    assert.equal(result.value, null);
    assert.ok(result.errors.guests);
  }
});

test("shared search normalizes a guest count from a form field", () => {
  const result = validateStaySearch(
    { ...query, guests: "2" },
    today,
  );

  assert.deepEqual(result.errors, {});
  assert.equal(result.value.guests, 2);
});

test("shared stay length handles month boundaries and invalid dates", () => {
  assert.equal(stayNights("2099-01-31", "2099-02-01"), 1);
  assert.equal(stayNights(query.checkIn, query.checkOut), 2);
  assert.ok(Number.isNaN(stayNights("invalid", query.checkOut)));
  assert.ok(Number.isNaN(stayNights("2099-02-31", "2099-03-02")));
});

test("shared PHP formatting converts centavos and groups whole pesos", () => {
  assert.match(formatPesos(0), /^₱\s?0\.00$/u);
  assert.match(formatPesos(12345), /^₱\s?123\.45$/u);
  assert.match(formatPesos(125000), /^₱\s?1,250\.00$/u);
});