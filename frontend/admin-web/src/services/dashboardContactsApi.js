import api from "./api";

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function nullableTimestamp(value) {
  return value === null || validTimestamp(value);
}

export async function loadDashboardContacts(_staffScope, signal) {
  const response = await api.get("/dashboard/contact-queue", { signal });
  const data = response.data?.data;
  if (!data || data.timezone !== "Asia/Manila" || !validTimestamp(data.asOf) ||
      !Number.isSafeInteger(data.total) || data.total < 0 || data.limit !== 20 ||
      !Array.isArray(data.items) || data.items.length !== Math.min(data.total, data.limit)) {
    throw new Error("Contact queue could not be verified.");
  }
  const ids = new Set();
  const items = data.items.map((item) => {
    if (!item || typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) ||
        ids.has(item.id) || typeof item.reservationNumber !== "string" || !item.reservationNumber ||
        typeof item.guest?.firstName !== "string" || typeof item.guest.lastName !== "string" ||
        !nullableTimestamp(item.expectedArrivalAt) || !nullableTimestamp(item.deadlineAt) ||
        !nullableTimestamp(item.firstContactedAt) ||
        !["INITIAL_CONTACT_NEEDED", "AWAITING_CONFIRMATION"].includes(item.attention) ||
        item.attention !== (item.firstContactedAt === null ? "INITIAL_CONTACT_NEEDED" : "AWAITING_CONFIRMATION") ||
        typeof item.deadlineReached !== "boolean" ||
        item.deadlineReached !== (item.deadlineAt !== null && Date.parse(item.deadlineAt) <= Date.parse(data.asOf))) {
      throw new Error("Contact queue could not be verified.");
    }
    ids.add(item.id);
    return {
      id: item.id, reservationNumber: item.reservationNumber,
      guest: { firstName: item.guest.firstName, lastName: item.guest.lastName },
      expectedArrivalAt: item.expectedArrivalAt, deadlineAt: item.deadlineAt,
      firstContactedAt: item.firstContactedAt, attention: item.attention,
      deadlineReached: item.deadlineReached,
    };
  });
  return { asOf: data.asOf, total: data.total, limit: data.limit, items };
}
