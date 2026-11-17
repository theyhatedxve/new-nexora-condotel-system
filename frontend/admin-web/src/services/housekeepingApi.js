import api from "./api";
import { getSession } from "./authApi";

export const housekeepingRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"];
function actor(id) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== id ||
      !housekeepingRoles.includes(session.user?.role)) throw new Error("Use the original authorized staff account.");
}
function path(id) {
  if (typeof id !== "string" || !id || id.length > 100) throw new Error("Invalid room.");
  return "/rooms/" + encodeURIComponent(id) + "/status";
}
export async function getHousekeepingHistory(key, signal) {
  const [actorId, id, page] = JSON.parse(key);
  actor(actorId);
  const response = await api.get(path(id) + "/history", { signal, params: { page } });
  actor(actorId);
  const data = response.data?.data;
  const statuses = ["READY", "CLEANING", "OCCUPIED", "MAINTENANCE", "OUT_OF_SERVICE", "NOT_RECORDED"];
  if (!Array.isArray(data?.items) || data.items.length > 20 ||
      !data.items.every((item) => typeof item?.id === "string" && typeof item.staffName === "string" &&
        typeof item.changedAt === "string" && Number.isFinite(Date.parse(item.changedAt)) &&
        statuses.includes(item.from) && statuses.includes(item.to) &&
        ["MANUAL", "CHECK_IN", "CHECK_OUT", "NOT_RECORDED"].includes(item.source)) ||
      data.page !== page || data.limit !== 20 || !Number.isSafeInteger(data.total) ||
      data.total < data.items.length) throw new Error("Room-status history is unavailable.");
  return data;
}
export async function updateHousekeeping(actorId, id, from, to) {
  actor(actorId);
  if (!((from === "READY" && to === "CLEANING") || (from === "CLEANING" && to === "READY"))) {
    throw new Error("Reload the current room status.");
  }
  const response = await api.patch(path(id), { status: to, expectedStatus: from });
  actor(actorId);
  const data = response.data?.data;
  if (data?.id !== id || data.status !== to) throw new Error("The room-status outcome is unconfirmed.");
  return data;
}
