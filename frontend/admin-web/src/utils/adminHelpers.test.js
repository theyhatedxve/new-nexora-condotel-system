import assert from "node:assert/strict";
import test from "node:test";
import { failureMessage } from "./guestBookingStaffPanelHelpers.js";
import { philippineToday } from "./propertyCollectionHelpers.js";
import { emptyDraft } from "./roomTypeManagementHelpers.js";
import { displayValue } from "./settingsHelpers.js";
import reconciliationQueueRange from "./reconciliationQueueRange.js";

for (const [status, expected] of [
  [401, "Your staff session ended. Sign in again before continuing."],
  [403, "Your current account cannot perform this action."],
  [404, "The reservation is unavailable. Refresh the reservation list."],
  [
    409,
    "The request cannot proceed in its current state. Details have been refreshed; check its status, deadlines, and payment records.",
  ],
  [
    400,
    "The action was rejected. Refresh the booking and check the required information.",
  ],
  [429, "Too many requests. Wait before checking the updated booking."],
]) {
  test(`staff booking failure ${status} retains its actionable message`, () => {
    assert.equal(failureMessage({ response: { status } }), expected);
  });
}

test("unknown staff booking failures require checking before repeating an action", () => {
  assert.equal(
    failureMessage(new Error("Network unavailable")),
    "The result could not be confirmed. Details have been refreshed. Check the booking before repeating any action.",
  );
});

test("settings distinguishes absent values from zero and false", () => {
  assert.equal(displayValue(null), "Not set");
  assert.equal(displayValue(""), "Not set");
  assert.equal(displayValue(0), 0);
  assert.equal(displayValue(false), false);
  assert.equal(displayValue("Property"), "Property");
});

test("each new room-type draft has independent editable values", () => {
  const first = emptyDraft();
  const second = emptyDraft();
  assert.notEqual(first, second);
  assert.deepEqual(first, {
    name: "",
    description: "",
    capacity: "",
    nightlyRate: "",
    isActive: true,
  });
  first.name = "Changed";
  assert.equal(second.name, "");
});

test("collection date uses the Philippine calendar", () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type).value;
  assert.equal(philippineToday(), `${value("year")}-${value("month")}-${value("day")}`);
});

for (const [meta, expected] of [
  [
    { page: 1, limit: 20, total: 0 },
    { start: 0, end: 0 },
  ],
  [
    { page: 1, limit: 20, total: 45 },
    { start: 1, end: 20 },
  ],
  [
    { page: 2, limit: 20, total: 45 },
    { start: 21, end: 40 },
  ],
  [
    { page: 3, limit: 20, total: 45 },
    { start: 41, end: 45 },
  ],
]) {
  test(`reconciliation range preserves page ${meta.page} with ${meta.total} records`, () => {
    const range = reconciliationQueueRange({ meta });
    assert.equal(range.start, expected.start);
    assert.equal(range.end, expected.end);
  });
}

test("reconciliation navigation keeps the queue name and adjacent page", () => {
  const calls = [];
  const range = reconciliationQueueRange({
    meta: { page: 2, limit: 20, total: 45 },
    name: "refunds",
    onPage: (...args) => calls.push(args),
  });
  range.previousPage();
  range.nextPage();
  assert.deepEqual(calls, [
    ["refunds", 1],
    ["refunds", 3],
  ]);
});
