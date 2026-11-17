import api from "./api";
import { validateReportRange } from "./reportsApi";

export const DEPOSIT_MOVEMENT_LABELS = {
  COLLECT: "Deposits collected", DEDUCT: "Deposit deductions",
  RESTORE: "Deposit restorations", RETURN: "Actual cash returns",
};

export async function getDepositReport(query, signal) {
  const range = validateReportRange(query.from, query.to);
  const page = query.page ?? 1;
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    throw new Error("Choose a valid deposit report page.");
  }
  const response = await api.get("/reports/deposits", {
    params: { from: range.from, to: range.to, page }, signal,
  });
  const data = response.data?.data;
  const validTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  if (!data || data.from !== range.from || data.to !== range.to || data.days !== range.days ||
      data.timezone !== "Asia/Manila" || data.currency !== "PHP" || !validTime(data.asOf) ||
      data.page !== page || data.limit !== 20 || !Number.isSafeInteger(data.total) || data.total < 0 ||
      !data.totals || !Object.keys(DEPOSIT_MOVEMENT_LABELS).every((kind) =>
        Number.isSafeInteger(data.totals[kind]) && data.totals[kind] >= 0) ||
      !Array.isArray(data.items) || data.items.length !== Math.max(0, Math.min(20, data.total - (page - 1) * 20))) {
    throw new Error("The deposit report could not be verified.");
  }
  const start = Date.parse(range.from + "T00:00:00+08:00");
  const end = Date.parse(range.to + "T00:00:00+08:00") + 86400000;
  const asOf = Date.parse(data.asOf);
  const ids = new Set();
  const items = data.items.map((item) => {
    if (!item || typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) ||
        typeof item.reservationId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.reservationId) ||
        typeof item.reservationNumber !== "string" || !item.reservationNumber ||
        !Object.hasOwn(DEPOSIT_MOVEMENT_LABELS, item.kind) || !Number.isSafeInteger(item.amountCentavos) ||
        item.amountCentavos < 1 || !validTime(item.createdAt) || Date.parse(item.createdAt) < start ||
        Date.parse(item.createdAt) >= end || Date.parse(item.createdAt) > asOf) {
      throw new Error("The deposit movement could not be verified.");
    }
    ids.add(item.id);
    return {
      id: item.id, reservationId: item.reservationId, reservationNumber: item.reservationNumber,
      kind: item.kind, amountCentavos: item.amountCentavos, createdAt: item.createdAt,
    };
  });
  return {
    from: data.from, to: data.to, asOf: data.asOf, total: data.total, page, limit: 20,
    totals: Object.fromEntries(Object.keys(DEPOSIT_MOVEMENT_LABELS).map((kind) => [kind, data.totals[kind]])),
    items,
  };
}
