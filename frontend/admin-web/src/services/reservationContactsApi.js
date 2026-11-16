import api from "./api";
import { getSession } from "./authApi";

export const contactPurposes = [
  "INITIAL_FOLLOW_UP", "ONE_WEEK_REMINDER", "ONE_DAY_REMINDER",
  "SHORT_NOTICE", "ARRIVAL_FOLLOW_UP",
];
export const contactResults = ["REACHED", "NO_ANSWER", "LEFT_MESSAGE", "UNREACHABLE"];
export const contactRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"];

function actor(actorId) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== actorId ||
      !contactRoles.includes(session.user?.role)) {
    throw new Error("Use the original authorized staff account.");
  }
}

function path(id) {
  if (typeof id !== "string" || !id || id.length > 100) {
    throw new Error("Invalid reservation.");
  }
  return "/staff/reservations/" + encodeURIComponent(id) + "/contacts";
}

export function contactStorageKey(actorId, reservationId) {
  return JSON.stringify(["nexora-contact-v1", api.defaults.baseURL, actorId, reservationId]);
}

export function contactDraft(input) {
  if (!input || typeof input.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId) ||
      !["PHONE", "EMAIL"].includes(input.channel) ||
      !contactPurposes.includes(input.purpose) ||
      !contactResults.includes(input.result) ||
      typeof input.notes !== "string" || input.notes.trim().length > 500 ||
      (input.expectedArrivalAt !== undefined &&
        (typeof input.expectedArrivalAt !== "string" ||
         !Number.isFinite(Date.parse(input.expectedArrivalAt))))) {
    throw new Error("Contact details or saved request are invalid.");
  }
  return {
    requestId: input.requestId.toLowerCase(), channel: input.channel,
    purpose: input.purpose, result: input.result, notes: input.notes.trim(),
    ...(input.expectedArrivalAt
      ? { expectedArrivalAt: new Date(input.expectedArrivalAt).toISOString() } : {}),
  };
}

function validContact(item) {
  return typeof item?.id === "string" && typeof item.staffName === "string" &&
    (item.staffUserId === null || typeof item.staffUserId === "string") &&
    typeof item.contactedAt === "string" && Number.isFinite(Date.parse(item.contactedAt)) &&
    ["PHONE", "EMAIL", "NOT_RECORDED"].includes(item.channel) &&
    [...contactPurposes, "INITIAL_CONTACT", "REMINDER"].includes(item.purpose) &&
    [...contactResults, "NOT_RECORDED"].includes(item.result) &&
    (item.notes === null || (typeof item.notes === "string" && item.notes.length <= 500)) &&
    (item.expectedArrivalAt === null ||
      (typeof item.expectedArrivalAt === "string" &&
       Number.isFinite(Date.parse(item.expectedArrivalAt)))) &&
    typeof item.historical === "boolean";
}

export async function listReservationContacts(key, signal) {
  const [actorId, reservationId, page] = JSON.parse(key);
  actor(actorId);
  const response = await api.get(path(reservationId), { signal, params: { page } });
  actor(actorId);
  const data = response.data?.data;
  if (!Array.isArray(data?.items) || data.items.length > 20 ||
      !data.items.every(validContact) || data.page !== page || data.limit !== 20 ||
      !Number.isSafeInteger(data.total) || data.total < data.items.length) {
    throw new Error("Contact history is unavailable.");
  }
  return data;
}

export async function saveReservationContact(actorId, reservationId, input) {
  actor(actorId);
  const response = await api.post(path(reservationId), contactDraft(input));
  actor(actorId);
  const data = response.data?.data;
  if (!validContact(data?.contact) || data.contact.staffUserId !== actorId ||
      typeof data.replayed !== "boolean") {
    throw new Error("The saved contact could not be confirmed. Retry the original request.");
  }
  return data;
}
