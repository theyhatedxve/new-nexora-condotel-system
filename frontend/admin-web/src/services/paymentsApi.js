import api from "./api";

function pathId(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Invalid payment.");
  }

  return encodeURIComponent(id);
}

function money(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function collection(data) {
  return (
    data &&
    money(data.collectedCentavos) &&
    money(data.refundedCentavos) &&
    money(data.pendingRefundCentavos) &&
    money(data.netPaidCentavos)
  );
}

function payment(data) {
  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.method !== "string" ||
    typeof data.status !== "string" ||
    !Number.isSafeInteger(data.amountCentavos) ||
    typeof data.currency !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.updatedAt !== "string" ||
    !(
      data.paidAt === null ||
      typeof data.paidAt === "string"
    ) ||
    typeof data.reservation?.id !== "string" ||
    typeof data.reservation.reservationNumber !== "string" ||
    typeof data.reservation.status !== "string" ||
    typeof data.requiresReview !== "boolean"
  ) {
    return false;
  }

  if (data.verification === "REVIEW_REQUIRED") {
    return (
      data.requiresReview &&
      data.collection === null
    );
  }

  if (
    ![
      "VERIFIED_COLLECTION",
      "NOT_COLLECTED",
    ].includes(data.verification) ||
    data.requiresReview ||
    data.currency !== "PHP" ||
    !collection(data.collection)
  ) {
    return false;
  }

  return data.verification === "VERIFIED_COLLECTION"
    ? data.collection.collectedCentavos > 0
    : data.collection.collectedCentavos === 0;
}

function bookingSummary(data) {
  return (
    data &&
    data.currency === "PHP" &&
    money(data.bookedTotalCentavos) &&
    collection(data) &&
    (
      data.balanceDueCentavos === null ||
      money(data.balanceDueCentavos)
    ) &&
    (
      data.overpaidCentavos === null ||
      money(data.overpaidCentavos)
    ) &&
    typeof data.hasPendingPayment === "boolean" &&
    typeof data.requiresReview === "boolean" &&
    [
      "UNPAID",
      "PARTIALLY_PAID",
      "PAID",
      "REFUNDED",
      "REVIEW_REQUIRED",
    ].includes(data.status)
  );
}

export async function listPayments(signal) {
  const response = await api.get(
    "/staff/payments",
    { signal },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.items.every(payment) ||
    data.limit !== 50 ||
    data.items.length > data.limit ||
    !Number.isSafeInteger(data.total) ||
    data.total < data.items.length
  ) {
    throw new Error("Payment list is unavailable.");
  }

  return data;
}

export async function getPayment(id, signal) {
  const response = await api.get(
    "/staff/payments/" + pathId(id),
    { signal },
  );

  const data = response.data?.data;

  if (
    !payment(data) ||
    data.id !== id ||
    typeof data.bookingRequiresReview !== "boolean" ||
    !(
      data.bookingSummary === null
        ? data.bookingRequiresReview
        : (
            bookingSummary(data.bookingSummary) &&
            data.bookingRequiresReview ===
              data.bookingSummary.requiresReview
          )
    )
  ) {
    throw new Error("Payment details are unavailable.");
  }

  return data;
}