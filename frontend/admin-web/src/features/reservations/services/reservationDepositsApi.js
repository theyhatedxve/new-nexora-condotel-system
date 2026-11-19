import api from "../../../shared/services/api.js";
import { getSession } from "../../auth/services/authApi.js";

export const depositStaffRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"];
export const depositManagerRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
export const depositActions = ["COLLECT", "DEDUCT", "AUTHORIZE_RETURN", "RETURN_CASH", "RESTORE_EXTENSION"];
function actor(id) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== id ||
      !depositStaffRoles.includes(session.user?.role)) throw new Error("Use the original authorized staff account.");
}
function path(id) {
  if (typeof id !== "string" || !id || id.length > 100) throw new Error("Invalid reservation.");
  return "/staff/reservations/" + encodeURIComponent(id) + "/deposits";
}
const money = (value) => Number.isSafeInteger(value) && value >= 0;
const time = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
function summary(value) {
  return value && ["collectedCentavos", "deductedCentavos", "returnedCentavos",
    "balanceCentavos", "reservedReturnCentavos", "availableCentavos"].every((key) => money(value[key])) &&
    value.balanceCentavos === value.collectedCentavos - value.deductedCentavos - value.returnedCentavos &&
    value.availableCentavos === value.balanceCentavos - value.reservedReturnCentavos;
}
export function depositStorageKey(actorId, id) {
  return JSON.stringify(["nexora-deposit-v1", api.defaults.baseURL, actorId, id]);
}
export function recoverDepositRequest(value) {
  if (!value || typeof value.label !== "string" || value.label.length > 1500 ||
      !depositActions.includes(value.command?.action) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.command?.requestId || "") ||
      JSON.stringify(value.command).length > 4000) throw new Error("Invalid saved deposit request.");
  return { command: value.command, label: value.label, phase: "pending" };
}
export async function listReservationDeposits(key, signal) {
  const [actorId, id, page] = JSON.parse(key);
  actor(actorId);
  const response = await api.get(path(id), { signal, params: { page } });
  actor(actorId);
  const data = response.data?.data;
  const charges = (items) => Array.isArray(items) && items.length <= 20 &&
    items.every((item) => typeof item?.id === "string" && typeof item.description === "string" &&
      ["DAMAGE", "LATE_CHECKOUT"].includes(item.kind) && money(item.amountCentavos));
  if (!summary(data?.summary) || !Array.isArray(data.items) || data.items.length > 20 ||
      !data.items.every((item) => typeof item?.id === "string" &&
        ["COLLECT", "DEDUCT", "RETURN", "RESTORE"].includes(item.kind) && money(item.amountCentavos) &&
        typeof item.reason === "string" && time(item.createdAt) && typeof item.recordedBy?.name === "string") ||
      !Array.isArray(data.pendingReturns) || data.pendingReturns.length > 20 ||
      !data.pendingReturns.every((item) => typeof item?.id === "string" && money(item.amountCentavos) &&
        typeof item.reason === "string" && time(item.createdAt) && typeof item.approvedBy?.name === "string") ||
      !charges(data.eligibleCharges) || !charges(data.restorableCharges) ||
      data.page !== page || data.limit !== 20 || !Number.isSafeInteger(data.total) ||
      data.total < data.items.length) throw new Error("Deposit records are unavailable.");
  return data;
}
export async function sendDepositRequest(actorId, id, command) {
  actor(actorId);
  const response = await api.post(path(id), command);
  actor(actorId);
  const data = response.data?.data;
  if (typeof data?.recordId !== "string" || typeof data.replayed !== "boolean" ||
      !summary(data.summary)) throw new Error("Deposit outcome is unconfirmed.");
  return data;
}
