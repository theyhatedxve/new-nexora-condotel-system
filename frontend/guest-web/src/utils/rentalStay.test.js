import test from "node:test";
import assert from "node:assert/strict";
import { rentalWindow, rentalSelection, readRental } from "./rentalStay.js";
import { parseStaySearch, staySearchParams, validateStaySearch } from "./staySearch.js";
import { validateResults } from "./validateAvailabilityResults.js";
import { loadBookingAttempt, saveBookingAttempt } from "./bookingAttempt.js";

const query = {
  checkIn: "2099-01-01", checkOut: "2099-01-01", guests: 3,
  rentalType: "HOURLY", rentalUnits: 2, arrivalTime: "15:00",
};
const quote = {
  id: "category", name: "Synthetic", capacity: 3, available: true,
  ...query, units: 2, rateCentavos: 45000, nightlyRateCentavos: 300000, nights: null,
  includedOccupancy: 2, extraPersonFeeCentavos: 10000,
  accommodationCentavos: 90000, extraPersonTotalCentavos: 20000,
  totalAmountCentavos: 110000, inventoryChecked: true,
  scheduledArrivalAt: "2099-01-01T07:00:00.000Z",
  scheduledDepartureAt: "2099-01-01T09:00:00.000Z",
};

test("new searches reject an elapsed arrival without blocking stored or URL selections", () => {
  const now = new Date("2099-01-01T07:00:00Z");
  const expired = validateStaySearch(query, "2099-01-01", now);
  assert.equal(expired.value, null);
  assert.match(expired.errors.arrivalTime, /future/);
  assert.ok(validateStaySearch({ ...query, arrivalTime: "16:00" }, "2099-01-01", now).value);
  assert.deepEqual(validateStaySearch(query, "2099-01-01").value, query);
});

test("hourly selections survive URL navigation with a same-day departure", () => {
  assert.deepEqual(parseStaySearch(staySearchParams(query), "2099-01-01"), query);
  assert.equal(rentalWindow(query).end, quote.scheduledDepartureAt);
  assert.equal(rentalWindow({ ...query, rentalType: "WEEKLY", rentalUnits: 1 }).checkOut, "2099-01-08");
  assert.equal(rentalWindow({ ...query, rentalType: "MONTHLY", rentalUnits: 1 }).checkOut, "2099-01-31");
});

test("rental selection rejects invalid dates, units, early arrival and hourly overruns", () => {
  for (const patch of [
    { checkIn: "2099-02-30" }, { rentalType: "INVALID" }, { rentalUnits: 0 },
    { rentalUnits: 1.5 }, { arrivalTime: "14:59" },
    { arrivalTime: "22:00", rentalUnits: 2 }, { rentalType: "MONTHLY", rentalUnits: 2 },
  ]) assert.throws(() => rentalSelection({ ...query, ...patch }));
  assert.throws(() => parseStaySearch(
    "checkIn=2099-01-01&checkOut=2099-01-01&guests=3&rentalType=HOURLY&rentalUnits=2",
    "2099-01-01",
  ));
});

test("availability validates rental timing, occupancy and the fee breakdown", () => {
  assert.equal(validateResults([quote], query)[0], quote);
  for (const patch of [
    { totalAmountCentavos: 100000 }, { rentalUnits: 3 }, { guests: 2 },
    { scheduledDepartureAt: "2099-01-01T10:00:00.000Z" },
    { extraPersonTotalCentavos: 10000 }, { includedOccupancy: 4 },
  ]) assert.throws(() => validateResults([{ ...quote, ...patch }], query));
  assert.throws(() => readRental({
    ...quote, rentalRateCentavos: 45000, inventoryStartAt: null, inventoryEndAt: null,
  }));
});

test("legacy date-range URLs and null rental fields remain readable", () => {
  const legacy = { checkIn: "2099-01-01", checkOut: "2099-01-03", guests: 2 };
  assert.deepEqual(parseStaySearch(staySearchParams(legacy), "2099-01-01"), legacy);
  assert.equal(readRental({ rentalType: null }), null);
});

test("recovery keeps rental fields even after the scheduled arrival has passed", () => {
  const previousWindow = globalThis.window;
  const records = new Map();
  globalThis.window = { sessionStorage: {
    getItem(key) { return records.get(key) ?? null; },
    setItem(key, value) { records.set(key, value); },
  } };
  try {
    const scope = "https://example.invalid/api|guest:synthetic";
    const attempt = {
      version: 1, apiScope: scope,
      requestId: "00000000-0000-4000-8000-000000000001",
      checkoutRequestId: "00000000-0000-4000-8000-000000000002",
      recoveryToken: "a".repeat(64), paymentPreference: "PAY_AT_PROPERTY", arrivalTime: "15:00",
      selection: { ...query, checkIn: "2001-01-01", checkOut: "2001-01-01", roomTypeId: "category" },
    };
    saveBookingAttempt(attempt, scope);
    assert.deepEqual(loadBookingAttempt(scope).selection, attempt.selection);
    assert.throws(() => saveBookingAttempt({ ...attempt, arrivalTime: "16:00" }, scope));
    const legacy = { ...attempt, selection: {
      roomTypeId: "category", checkIn: "2001-01-01", checkOut: "2001-01-02", guests: 2,
    } };
    saveBookingAttempt(legacy, scope);
    assert.deepEqual(loadBookingAttempt(scope).selection, legacy.selection);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
