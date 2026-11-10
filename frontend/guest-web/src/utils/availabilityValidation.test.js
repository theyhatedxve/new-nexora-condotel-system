import assert from "node:assert/strict";
import test from "node:test";
import { validateResults } from "./validateAvailabilityResults.js";
import {
  differenceInNights,
  formatCentavos,
  validateSearch,
} from "./availabilitySearch.js";

const query = { checkIn: "2099-01-01", checkOut: "2099-01-03", guests: 2 };
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
  const results = [room, { ...room, id: "studio", available: false }];
  assert.equal(validateResults(results, query), results);
  assert.deepEqual(validateResults([], query), []);
  assert.doesNotThrow(() =>
    validateResults([{ ...room, nightlyRateCentavos: 0, totalAmountCentavos: 0 }], query),
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
    assert.throws(() => validateResults([{ ...room, ...patch }], query), {
      message: "Invalid availability response.",
    });
  });
}

test("availability rejects duplicate room IDs and null records", () => {
  assert.throws(() => validateResults([room, { ...room }], query));
  assert.throws(() => validateResults([null], query));
});

test("legacy search preserves missing-date, past-date, and date-order feedback", () => {
  assert.equal(
    validateSearch({ ...query, checkIn: "" }),
    "Please select check-in and check-out dates.",
  );
  assert.equal(
    validateSearch({ ...query, checkIn: "2000-01-01" }),
    "Check-in cannot be in the past.",
  );
  assert.equal(
    validateSearch({ ...query, checkOut: query.checkIn }),
    "Check-out must be later than check-in.",
  );
});

test("legacy search keeps its 30-night boundary and integer guest validation", () => {
  assert.equal(validateSearch({ ...query, checkOut: "2099-01-31" }), "");
  assert.equal(
    validateSearch({ ...query, checkOut: "2099-02-01" }),
    "The maximum stay is 30 nights.",
  );
  for (const guests of [0, -1, 1.5, NaN]) {
    assert.equal(
      validateSearch({ ...query, guests }),
      "Please enter at least one guest.",
    );
  }
  assert.equal(differenceInNights("2099-01-31", "2099-02-01"), 1);
});

test("legacy money formatting preserves centavo conversion", () => {
  assert.equal(
    formatCentavos(12345),
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(123.45),
  );
});
