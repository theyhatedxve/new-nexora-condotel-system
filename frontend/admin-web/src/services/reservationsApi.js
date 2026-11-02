import api from "./api";

function pathId(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Invalid record.");
  }

  return encodeURIComponent(id);
}

function reservation(data) {
  return (
    data &&
    typeof data.id === "string" &&
    typeof data.reservationNumber === "string" &&
    typeof data.status === "string" &&
    typeof data.checkInDate === "string" &&
    typeof data.checkOutDate === "string" &&
    typeof data.roomType?.name === "string"
  );
}

export async function listReservations(signal) {
  const response = await api.get(
    "/staff/reservations",
    { signal },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.items.every(
      (item) =>
        reservation(item) &&
        Number.isSafeInteger(item.guestCount) &&
        item.guestCount > 0 &&
        typeof item.guest?.id === "string" &&
        typeof item.guest.firstName === "string" &&
        typeof item.guest.lastName === "string",
    ) ||
    data.limit !== 50 ||
    data.items.length > data.limit ||
    !Number.isSafeInteger(data.total) ||
    data.total < data.items.length
  ) {
    throw new Error(
      "Reservation list is unavailable.",
    );
  }

  return data;
}

export async function getReservation(id, signal) {
  const response = await api.get(
    "/staff/reservations/" + pathId(id),
    { signal },
  );

  const data = response.data?.data;

  if (
    !reservation(data) ||
    typeof data.guest?.id !== "string" ||
    typeof data.guest.firstName !== "string" ||
    typeof data.guest.lastName !== "string" ||
    !(
      data.guest.email === null ||
      typeof data.guest.email === "string"
    ) ||
    !(
      data.guest.phone === null ||
      typeof data.guest.phone === "string"
    ) ||
    !Number.isSafeInteger(data.guestCount) ||
    data.guestCount < 1 ||
    !Number.isSafeInteger(data.nightlyRateCentavos) ||
    data.nightlyRateCentavos < 0 ||
    !Number.isSafeInteger(data.totalAmountCentavos) ||
    data.totalAmountCentavos < 0
  ) {
    throw new Error(
      "Reservation details are unavailable.",
    );
  }

  return data;
}

export async function getAssignmentHistory(
  id,
  signal,
) {
  const response = await api.get(
    "/reservations/" + pathId(id) + "/assignments",
    { signal },
  );

  const data = response.data?.data;

  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        typeof item?.id === "string" &&
        typeof item.room?.roomNumber === "string" &&
        typeof item.assignedAt === "string" &&
        (
          item.releasedAt === null ||
          typeof item.releasedAt === "string"
        ),
    )
  ) {
    throw new Error(
      "Assignment history is unavailable.",
    );
  }

  return data;
}

export async function getReservationPaymentSummary(
  id,
  signal,
) {
  const response = await api.get(
    "/payments/reservations/" + pathId(id) + "/summary",
    { signal },
  );

  const data = response.data?.data;

  const amounts = [
    "bookedTotalCentavos",
    "collectedCentavos",
    "refundedCentavos",
    "pendingRefundCentavos",
    "netPaidCentavos",
  ];

  if (
    !data ||
    data.currency !== "PHP" ||
    typeof data.requiresReview !== "boolean" ||
    typeof data.hasPendingPayment !== "boolean" ||
    ![
      "UNPAID",
      "PARTIALLY_PAID",
      "PAID",
      "REFUNDED",
      "REVIEW_REQUIRED",
    ].includes(data.status) ||
    data.requiresReview !==
      (data.status === "REVIEW_REQUIRED") ||
    !amounts.every(
      (key) =>
        Number.isSafeInteger(data[key]) &&
        data[key] >= 0,
    ) ||
    !(
      data.balanceDueCentavos === null ||
      (
        Number.isSafeInteger(data.balanceDueCentavos) &&
        data.balanceDueCentavos >= 0
      )
    )
  ) {
    throw new Error(
      "Payment summary is unavailable.",
    );
  }

  return data;
}