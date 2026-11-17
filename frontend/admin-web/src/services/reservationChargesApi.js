import api from "./api";
import { getSession } from "./authApi";

export const chargeStaffRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"];
export const chargeManagerRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
export const chargeActions = ["PROPOSE_DAMAGE", "PROPOSE_EXTENSION", "APPROVE", "REJECT",
  "COLLECT", "APPLY_EXTENSION", "REFUND_UNFULFILLED_EXTENSION"];
function actor(id) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== id ||
      !chargeStaffRoles.includes(session.user?.role)) throw new Error("Use the original staff account.");
}
function path(id) {
  if (typeof id !== "string" || !id || id.length > 100) throw new Error("Invalid reservation.");
  return "/staff/reservations/" + encodeURIComponent(id) + "/charges";
}
export function chargeStorageKey(actorId, id) {
  return JSON.stringify(["nexora-charge-v1", api.defaults.baseURL, actorId, id]);
}
const time = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableTime = (value) => value === null || time(value);
const money = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
function valid(item) {
  const receipt = item?.receipt;
  return typeof item?.id === "string" && ["DAMAGE", "LATE_CHECKOUT"].includes(item.kind) &&
    ["PENDING", "APPROVED", "REJECTED", "VOIDED"].includes(item.status) &&
    typeof item.description === "string" &&
    (item.evidenceNotes === null || typeof item.evidenceNotes === "string") &&
    money(item.amountCentavos) && time(item.createdAt) && typeof item.proposedBy?.name === "string" &&
    (item.reviewedBy === null || typeof item.reviewedBy?.name === "string") &&
    [item.reviewedAt, item.appliedAt, item.billingBaseDepartureAt, item.fromDepartureAt,
      item.requestedDepartureAt].every(nullableTime) &&
    (item.billableHours === null || money(item.billableHours)) &&
    (item.hourlyRateCentavos === null || money(item.hourlyRateCentavos)) &&
    (receipt === null || (typeof receipt.id === "string" && money(receipt.amountCentavos) &&
      ["CASH", "DEPOSIT"].includes(receipt.source) &&
      receipt.amountCentavos === item.amountCentavos && time(receipt.collectedAt) &&
      nullableTime(receipt.refundedAt) && typeof receipt.correctionRequired === "boolean" &&
      typeof receipt.collectedBy?.name === "string" &&
      (receipt.refundedBy === null || typeof receipt.refundedBy?.name === "string") &&
      (receipt.refundReason === null || typeof receipt.refundReason === "string")));
}
export function recoverChargeRequest(value) {
  if (!value || typeof value.label !== "string" || value.label.length > 1500 ||
      !chargeActions.includes(value.command?.action) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.command?.requestId || "") ||
      JSON.stringify(value.command).length > 4000) throw new Error("Invalid saved charge request.");
  return { command: value.command, label: value.label, phase: "pending" };
}
export async function listReservationCharges(key, signal) {
  const [actorId, id, page] = JSON.parse(key);
  actor(actorId);
  const response = await api.get(path(id), { signal, params: { page } });
  actor(actorId);
  const data = response.data?.data;
  if (!Array.isArray(data?.items) || data.items.length > 20 || !data.items.every(valid) ||
      data.page !== page || data.limit !== 20 || !Number.isSafeInteger(data.total) ||
      data.total < data.items.length) throw new Error("Additional charges are unavailable.");
  return data;
}
export async function sendChargeRequest(actorId, id, command) {
  actor(actorId);
  const response = await api.post(path(id), command);
  actor(actorId);
  const data = response.data?.data;
  if (!valid(data?.charge) || !["PROCESSED", "REVIEW_REQUIRED"].includes(data.outcome) ||
      typeof data.replayed !== "boolean") throw new Error("Charge outcome is unconfirmed.");
  return data;
}
