import api from "../../../shared/services/api.js";

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function readQueue(queue) {
  if (queue === null) return null;
  if (!queue || !Number.isSafeInteger(queue.total) || queue.total < 0 ||
      !Array.isArray(queue.items) || queue.items.length !== Math.min(queue.total, 20)) {
    throw new Error("Dashboard attention queue could not be verified.");
  }
  const ids = new Set();
  const items = queue.items.map((item) => {
    if (!item || typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) ||
        typeof item.reservationId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(item.reservationId) ||
        typeof item.reservationNumber !== "string" || !item.reservationNumber ||
        typeof item.label !== "string" || !item.label ||
        !Number.isSafeInteger(item.amountCentavos) || item.amountCentavos < 0 || !validTimestamp(item.createdAt)) {
      throw new Error("Dashboard attention item could not be verified.");
    }
    ids.add(item.id);
    return {
      id: item.id, reservationId: item.reservationId, reservationNumber: item.reservationNumber,
      label: item.label, amountCentavos: item.amountCentavos, createdAt: item.createdAt,
    };
  });
  return { total: queue.total, items };
}

export async function loadDashboardAttention(_staffScope, signal) {
  const response = await api.get("/dashboard/attention-queues", { signal });
  const data = response.data?.data;
  if (!data || data.timezone !== "Asia/Manila" || data.currency !== "PHP" || data.limit !== 20 ||
      !validTimestamp(data.asOf) || typeof data.canReviewReconciliation !== "boolean") {
    throw new Error("Dashboard attention summary could not be verified.");
  }
  const result = {
    asOf: data.asOf, canReviewReconciliation: data.canReviewReconciliation,
    chargeApprovals: readQueue(data.chargeApprovals), depositReturns: readQueue(data.depositReturns),
    extensionCorrections: readQueue(data.extensionCorrections),
  };
  if (result.depositReturns === null || (!result.canReviewReconciliation && result.extensionCorrections !== null)) {
    throw new Error("Dashboard attention permissions could not be verified.");
  }
  return result;
}
