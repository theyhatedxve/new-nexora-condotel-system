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

function bookedRentalTiming(overrides = {}) {
  return {
    rentalType: "NIGHTLY",
    rentalUnits: 1,
    rentalRateCentavos: 450000,
    includedOccupancy: 2,
    extraPersonFeeCentavos: 0,
    accommodationCentavos: 450000,
    extraPersonTotalCentavos: 0,
    totalAmountCentavos: 450000,
    scheduledArrivalAt: "2099-01-01T07:00:00.000Z",
    scheduledDepartureAt: "2099-01-02T07:00:00.000Z",
    inventoryStartAt: "2099-01-01T07:00:00.000Z",
    inventoryEndAt: "2099-01-02T07:00:00.000Z",
    actualArrivalAt: null,
    actualDepartureAt: null,
    ...overrides,
  };
}

test("pre-arrival bookings retain the original scheduled interval", () => {
  const booking = bookedRentalTiming();
  assert.equal(readRental(booking).inventoryEndAt, booking.scheduledDepartureAt);
  assert.throws(() => readRental(bookedRentalTiming({
    inventoryEndAt: "2099-01-02T08:00:00.000Z",
  })));
});

test("actual check-in may shift the full rental interval", () => {
  const booking = bookedRentalTiming({
    actualArrivalAt: "2099-01-01T06:45:00.000Z",
    inventoryStartAt: "2099-01-01T06:45:00.000Z",
    inventoryEndAt: "2099-01-02T06:45:00.000Z",
  });
  const rental = readRental(booking);
  assert.equal(rental.inventoryStartAt, booking.actualArrivalAt);
  assert.equal(rental.inventoryEndAt, booking.inventoryEndAt);
  assert.equal(rental.scheduledDepartureAt, "2099-01-02T07:00:00.000Z");
});

test("late check-in may preserve the scheduled departure", () => {
  const booking = bookedRentalTiming({
    actualArrivalAt: "2099-01-01T08:00:00.000Z",
    inventoryStartAt: "2099-01-01T08:00:00.000Z",
  });
  assert.equal(readRental(booking).inventoryEndAt, booking.scheduledDepartureAt);
});

test("an extended stay preserves original duration and pricing", () => {
  const booking = bookedRentalTiming({
    actualArrivalAt: "2099-01-01T07:00:00.000Z",
    inventoryEndAt: "2099-01-02T09:10:00.000Z",
  });
  const rental = readRental(booking);
  assert.equal(rental.inventoryEndAt, booking.inventoryEndAt);
  assert.equal(rental.scheduledDepartureAt, "2099-01-02T07:00:00.000Z");
  assert.equal(rental.rentalUnits, 1);
  assert.equal(rental.accommodationCentavos, 450000);
});

test("actual checkout may occur before or after recorded departure", () => {
  for (const actualDepartureAt of [
    "2099-01-02T06:00:00.000Z",
    "2099-01-02T09:30:00.000Z",
  ]) {
    const booking = bookedRentalTiming({
      actualArrivalAt: "2099-01-01T07:00:00.000Z",
      actualDepartureAt,
    });
    assert.equal(readRental(booking).actualDepartureAt, actualDepartureAt);
  }
});

test("invalid booking intervals and original prices remain rejected", () => {
  const checkedIn = bookedRentalTiming({
    actualArrivalAt: "2099-01-01T07:00:00.000Z",
  });
  for (const patch of [
    { inventoryStartAt: null },
    { inventoryEndAt: null },
    { inventoryEndAt: "invalid" },
    { inventoryEndAt: checkedIn.inventoryStartAt },
    { inventoryEndAt: "2099-01-01T06:00:00.000Z" },
    { inventoryStartAt: "2099-01-01T08:00:00.000Z" },
    { actualDepartureAt: "2099-01-01T06:00:00.000Z" },
    { scheduledDepartureAt: "2099-01-02T08:00:00.000Z" },
    { accommodationCentavos: 450001 },
  ]) {
    assert.throws(() => readRental({ ...checkedIn, ...patch }));
  }
  assert.throws(() => readRental(bookedRentalTiming({
    actualDepartureAt: "2099-01-02T07:00:00.000Z",
  })));
});

test("all rental types retain their selection across stay URLs", () => {
  const cases = [
    ["HOURLY", 2, "2099-01-01"],
    ["NIGHTLY", 3, "2099-01-04"],
    ["WEEKLY", 2, "2099-01-15"],
    ["MONTHLY", 1, "2099-01-31"],
  ];

  for (const [rentalType, rentalUnits, checkOut] of cases) {
    const selection = {
      checkIn: "2099-01-01",
      checkOut,
      guests: 3,
      rentalType,
      rentalUnits,
      arrivalTime: "16:30",
    };

    const search = staySearchParams(selection);
    const detailsSelection = parseStaySearch(search, "2099-01-01");
    const checkoutSelection = parseStaySearch(
      staySearchParams(detailsSelection),
      "2099-01-01",
    );

    assert.deepEqual(detailsSelection, selection);
    assert.deepEqual(checkoutSelection, selection);
    assert.deepEqual(rentalSelection(checkoutSelection), {
      rentalType,
      rentalUnits,
      arrivalTime: "16:30",
    });
  }
});

test("all rental types recover original selections and request IDs", () => {
  const previousWindow = globalThis.window;
  const records = new Map();

  globalThis.window = {
    sessionStorage: {
      getItem(key) {
        return records.get(key) ?? null;
      },
      setItem(key, value) {
        records.set(key, value);
      },
    },
  };

  try {
    for (const rentalType of ["HOURLY", "NIGHTLY", "WEEKLY", "MONTHLY"]) {
      const scope = "https://example.invalid/api|guest:synthetic-" + rentalType;
      const draft = {
        roomTypeId: "category",
        checkIn: "2001-01-01",
        guests: 3,
        rentalType,
        rentalUnits: 1,
        arrivalTime: "16:30",
      };
      const selection = {
        ...draft,
        checkOut: rentalWindow(draft).checkOut,
      };
      const attempt = {
        version: 1,
        apiScope: scope,
        requestId: "00000000-0000-4000-8000-000000000001",
        checkoutRequestId: "00000000-0000-4000-8000-000000000002",
        recoveryToken: "a".repeat(64),
        paymentPreference: "PAY_AT_PROPERTY",
        arrivalTime: selection.arrivalTime,
        selection,
      };

      saveBookingAttempt(attempt, scope);
      assert.deepEqual(loadBookingAttempt(scope), attempt);
      assert.deepEqual(loadBookingAttempt(scope), attempt);

      assert.throws(() => saveBookingAttempt({
        ...attempt,
        arrivalTime: "17:30",
      }, scope));
      assert.throws(() => saveBookingAttempt({
        ...attempt,
        selection: { ...selection, checkOut: "2001-02-01" },
      }, scope));
      assert.throws(() => saveBookingAttempt({
        ...attempt,
        requestId: "00000000-0000-4000-8000-000000000003",
      }, scope));

      assert.deepEqual(loadBookingAttempt(scope), attempt);
    }
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
