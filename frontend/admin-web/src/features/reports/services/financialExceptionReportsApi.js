import api from "../../../shared/services/api.js";
import { validateReportRange } from "./reportsApi.js";

export const EXCEPTION_REASON_LABELS = {
  CLOSED_BOOKING_CAPTURE: "Capture against a closed booking",
  EXCESS_COLLECTION: "Excess collection",
  UNFULFILLED_CAPTURE: "Capture awaiting booking resolution",
  LEDGER_REVIEW_REQUIRED: "Payment ledger requires review",
  UNKNOWN: "Reason requires review",
};
export const EXCEPTION_STATE_LABELS = {
  OPEN: "Open", RESOLVED: "Resolved", REVIEW: "Status requires review",
};

export async function getFinancialExceptionReport(query, signal) {
  const range = validateReportRange(query.from, query.to);
  const page = query.page ?? 1;
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error("Choose a valid report page.");
  const response = await api.get("/reports/financial-exceptions", {
    params: { from: range.from, to: range.to, page }, signal,
  });
  const data = response.data?.data;
  const validTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  const validId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
  if (!data || data.from !== range.from || data.to !== range.to || data.days !== range.days ||
      data.timezone !== "Asia/Manila" || !validTime(data.asOf) || data.page !== page || data.limit !== 20 ||
      !Number.isSafeInteger(data.total) || data.total < 0 || !data.counts ||
      !Object.keys(EXCEPTION_STATE_LABELS).every((key) => Number.isSafeInteger(data.counts[key]) && data.counts[key] >= 0) ||
      data.counts.OPEN + data.counts.RESOLVED + data.counts.REVIEW !== data.total ||
      !Array.isArray(data.items) || data.items.length !== Math.max(0, Math.min(20, data.total - (page - 1) * 20))) {
    throw new Error("Financial-exception report could not be verified.");
  }
  const start = Date.parse(range.from + "T00:00:00+08:00");
  const end = Date.parse(range.to + "T00:00:00+08:00") + 86400000;
  const ids = new Set();
  const items = data.items.map((item) => {
    if (!item || !validId(item.id) || ids.has(item.id) || !validId(item.paymentId) || !validId(item.reservationId) ||
        typeof item.reservationNumber !== "string" || !item.reservationNumber ||
        !Object.hasOwn(EXCEPTION_STATE_LABELS, item.state) || !Object.hasOwn(EXCEPTION_REASON_LABELS, item.reason) ||
        !validTime(item.createdAt) || Date.parse(item.createdAt) < start || Date.parse(item.createdAt) >= end ||
        Date.parse(item.createdAt) > Date.parse(data.asOf) || !(item.lastUpdatedAt === null || validTime(item.lastUpdatedAt))) {
      throw new Error("Financial notice could not be verified.");
    }
    ids.add(item.id);
    return {
      id: item.id, state: item.state, reason: item.reason, createdAt: item.createdAt,
      lastUpdatedAt: item.lastUpdatedAt, paymentId: item.paymentId,
      reservationId: item.reservationId, reservationNumber: item.reservationNumber,
    };
  });
  return {
    asOf: data.asOf, total: data.total, page,
    counts: { OPEN: data.counts.OPEN, RESOLVED: data.counts.RESOLVED, REVIEW: data.counts.REVIEW }, items,
  };
}
