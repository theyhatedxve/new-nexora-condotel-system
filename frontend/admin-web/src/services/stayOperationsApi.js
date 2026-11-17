import api from "./api";
import { getSession } from "./authApi";

export const stayStaffRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"];
const phases = [
  "NOT_CHECKED_IN", "CHECKED_OUT", "TIMING_REVIEW",
  "BEFORE_DEPARTURE", "WITHIN_GRACE", "PAST_GRACE",
];
const availability = [
  "NOT_REQUESTED", "NOT_APPLICABLE", "TIMING_REVIEW", "INVALID_EXTENSION",
  "HOURLY_CLOSING_LIMIT", "INVENTORY_REVIEW_REQUIRED", "AVAILABLE_FOR_REVIEW",
];

function requireActor(actorId) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== actorId ||
      !stayStaffRoles.includes(session.user?.role)) {
    throw new Error("Use the original authorized staff account.");
  }
}

function optionalTime(value) {
  return value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

export async function getStayOperations(key, signal) {
  const [actorId, id, requestedDepartureAt] = JSON.parse(key);
  requireActor(actorId);
  if (typeof id !== "string" || !id || id.length > 100) {
    throw new Error("Invalid reservation.");
  }
  const response = await api.get(
    "/staff/reservations/" + encodeURIComponent(id) + "/stay-operations",
    { signal, params: requestedDepartureAt ? { requestedDepartureAt } : {} },
  );
  requireActor(actorId);
  const data = response.data?.data;
  if (!data || data.reservationId !== id ||
      !["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED"].includes(data.status) ||
      !phases.includes(data.phase) || !availability.includes(data.availability) ||
      data.readOnly !== true || data.approvalGranted !== false ||
      typeof data.checkedAt !== "string" || !Number.isFinite(Date.parse(data.checkedAt)) ||
      ![data.effectiveDepartureAt, data.graceEndsAt, data.actualArrivalAt,
        data.actualDepartureAt, data.requestedDepartureAt, data.paidBillingThroughAt].every(optionalTime) ||
      !(data.assignmentId === null || typeof data.assignmentId === "string") ||
      !(data.roomStatus === null ||
        ["READY", "OCCUPIED", "CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"].includes(data.roomStatus)) ||
      data.requestedDepartureAt !== requestedDepartureAt) {
    throw new Error("Stay operations guidance is unavailable.");
  }
  return data;
}
