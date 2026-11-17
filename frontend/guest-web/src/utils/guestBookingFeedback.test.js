import test from "node:test";
import assert from "node:assert/strict";
import { guestBookingFeedback } from "./guestBookingFeedback.js";

function feedback(status, overrides = {}) {
  return guestBookingFeedback({
    booking: { status, paymentPreference: "PAYMONGO" },
    summary: {
      reservationStatus: status,
      status: "UNPAID",
      requiresReview: false,
      balanceDueCentavos: 450000,
    },
    ...overrides,
  });
}

test("each reservation state has a distinct heading", () => {
  const expected = {
    PENDING: "Your booking request was received",
    CONFIRMED: "Your reservation is confirmed",
    CHECKED_IN: "You are checked in",
    CHECKED_OUT: "Your stay is complete",
    CANCELLED: "Your booking was cancelled",
    EXPIRED: "Your booking request expired",
  };
  for (const [status, title] of Object.entries(expected)) {
    assert.equal(feedback(status).title, title);
  }
});

test("checked-in and closed stays never offer online payment", () => {
  for (const status of ["CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED"]) {
    const result = feedback(status);
    assert.equal(result.canContinuePayment, false);
    assert.doesNotMatch(result.message, /Reception completes check-in/);
  }
});

test("review warnings take priority even when payment is marked paid", () => {
  for (const status of ["CONFIRMED", "CHECKED_IN", "CANCELLED"]) {
    const result = feedback(status, {
      summary: {
        reservationStatus: status,
        status: "PAID",
        requiresReview: true,
        balanceDueCentavos: 0,
      },
    });
    assert.match(result.title, /review/);
    assert.equal(result.paid, false);
    assert.equal(result.canContinuePayment, false);
    assert.equal(result.canStartAnother, false);
  }
  assert.equal(
    feedback("PENDING", { paymentState: "REVIEW_REQUIRED" }).canContinuePayment,
    false,
  );
});

test("payment and reservation confirmation remain separate", () => {
  const result = feedback("PENDING", {
    summary: {
      reservationStatus: "PENDING", status: "PAID",
      requiresReview: false, balanceDueCentavos: 0,
    },
  });
  assert.equal(result.paid, true);
  assert.equal(result.title, "Your booking request was received");
  assert.equal(result.canContinuePayment, false);
  assert.match(result.message, /pending/);
});

test("deadline feedback blocks payment without expiring the reservation", () => {
  const result = feedback("PENDING", { deadlineReached: true });
  assert.equal(result.canContinuePayment, false);
  assert.equal(result.closed, false);
  assert.match(result.message, /deadline has passed/);
});

test("only eligible online stays with a verified balance offer payment", () => {
  assert.equal(feedback("PENDING").canContinuePayment, true);
  assert.equal(feedback("CONFIRMED").canContinuePayment, true);
  assert.equal(feedback("PENDING", { summary: null }).canContinuePayment, false);
  assert.equal(feedback("PENDING", {
    booking: { status: "PENDING", paymentPreference: "PAY_AT_PROPERTY" },
  }).canContinuePayment, false);
});

test("the latest summary determines the displayed reservation state", () => {
  const result = feedback("CONFIRMED", {
    summary: {
      reservationStatus: "CHECKED_IN", status: "PAID",
      requiresReview: false, balanceDueCentavos: 0,
    },
  });
  assert.equal(result.title, "You are checked in");
  assert.equal(result.paid, true);
  assert.equal(result.canContinuePayment, false);
});

test("closed paid history does not imply an active reservation", () => {
  const result = feedback("CHECKED_OUT", {
    summary: {
      reservationStatus: "CHECKED_OUT", status: "PAID",
      requiresReview: false, balanceDueCentavos: null,
    },
  });
  assert.equal(result.closed, true);
  assert.equal(result.paid, true);
  assert.equal(result.title, "Your stay is complete");
  assert.equal(result.canContinuePayment, false);
});
