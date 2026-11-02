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

const idleAction = Object.freeze({
  status: "idle",
  kind: null,
  message: "",
});

const actionStates = new Map();
const actionListeners = new Set();

const actionMessages = {
  assign: "Room assigned.",
  reassign: "Room reassigned.",
  release: "Assignment released.",
  cancel: "Reservation cancelled.",
  "check-in": "Guest checked in.",
  "check-out": "Guest checked out.",
};

export function subscribeReservationActions(listener) {
  actionListeners.add(listener);

  return () => actionListeners.delete(listener);
}

export function getReservationActionState(id) {
  return actionStates.get(id) ?? idleAction;
}

function publishAction(id, status, kind, message) {
  actionStates.set(id, {
    status,
    kind,
    message,
  });

  actionListeners.forEach((listener) => listener());
}

export function acknowledgeReservationAction(id) {
  if (
    getReservationActionState(id).status === "pending"
  ) {
    return;
  }

  actionStates.delete(id);
  actionListeners.forEach((listener) => listener());
}

function actionRequest(command) {
  const base =
    "/reservations/" + pathId(command.reservationId);

  if (
    typeof command.reservationNumber !== "string" ||
    !command.reservationNumber
  ) {
    throw new Error(
      "Reload the reservation before choosing an action.",
    );
  }

  switch (command.kind) {
    case "assign":
      pathId(command.roomId);

      return {
        path: base + "/assignments",
        body: {
          roomId: command.roomId,
        },
      };

    case "reassign":
      pathId(command.roomId);

      return {
        path:
          base +
          "/assignments/" +
          pathId(command.assignmentId) +
          "/reassign",
        body: {
          roomId: command.roomId,
        },
      };

    case "release":
      return {
        path:
          base +
          "/assignments/" +
          pathId(command.assignmentId) +
          "/release",
        body: {},
      };

    case "cancel": {
      const reason =
        typeof command.reason === "string"
          ? command.reason.trim()
          : "";

      if (reason.length < 3 || reason.length > 500) {
        throw new Error(
          "Enter a cancellation reason of 3–500 characters.",
        );
      }

      return {
        path: base + "/cancel",
        body: { reason },
      };
    }

    case "check-in":
      if (command.identityVerified !== true) {
        throw new Error(
          "Complete the guest identity check first.",
        );
      }

      pathId(command.assignmentId);

      return {
        path: base + "/check-in",
        body: {
          assignmentId: command.assignmentId,
          identityVerified: true,
        },
      };

    case "check-out":
      pathId(command.assignmentId);

      return {
        path: base + "/check-out",
        body: {
          assignmentId: command.assignmentId,
        },
      };

    default:
      throw new Error(
        "Choose a supported reservation action.",
      );
  }
}

function confirmedAction(command, data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (
    ["assign", "reassign", "release"].includes(
      command.kind,
    )
  ) {
    if (
      typeof data.id !== "string" ||
      typeof data.roomId !== "string"
    ) {
      return false;
    }

    if (command.kind === "release") {
      return (
        data.id === command.assignmentId &&
        typeof data.releasedAt === "string" &&
        Number.isFinite(Date.parse(data.releasedAt))
      );
    }

    return (
      data.roomId === command.roomId &&
      data.releasedAt === null &&
      (
        command.kind !== "reassign" ||
        data.id !== command.assignmentId
      )
    );
  }

  const target = {
    cancel: "CANCELLED",
    "check-in": "CHECKED_IN",
    "check-out": "CHECKED_OUT",
  }[command.kind];

  return (
    data.reservationNumber ===
      command.reservationNumber &&
    data.status === target &&
    (
      command.kind === "cancel"
        ? typeof data.alreadyCancelled === "boolean"
        : typeof data.alreadyProcessed === "boolean"
    )
  );
}

function rejectionMessage(error) {
  const value = error.response?.data?.message;

  const text = Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .join(" ")
    : value;

  return typeof text === "string" && text.trim()
    ? text.slice(0, 600)
    : "The operation was rejected. Review the details before trying again.";
}

export async function performReservationAction(input) {
  const command = { ...input };
  const id = command.reservationId;
  const current = getReservationActionState(id);

  if (
    ["pending", "unknown", "conflict"].includes(
      current.status,
    )
  ) {
    throw new Error(
      "An operation is pending or requires review.",
    );
  }

  let request;

  try {
    request = actionRequest(command);
  } catch (error) {
    publishAction(
      id,
      "error",
      command.kind,
      error.message,
    );

    throw error;
  }

  publishAction(
    id,
    "pending",
    command.kind,
    "Saving reservation action…",
  );

  try {
    const response = await api.post(
      request.path,
      request.body,
    );

    const data = response.data?.data;

    if (!confirmedAction(command, data)) {
      throw new Error(
        "Unconfirmed operation response.",
      );
    }

    publishAction(
      id,
      "success",
      command.kind,
      actionMessages[command.kind],
    );

    return data;
  } catch (error) {
    const code = error.response?.status;

    const known = [
      400,
      401,
      403,
      404,
      409,
      429,
    ].includes(code);

    const status =
      code === 409
        ? "conflict"
        : known
          ? "error"
          : "unknown";

    const message = known
      ? rejectionMessage(error)
      : "The outcome could not be confirmed. The operation may have completed. Reload and review the records before choosing another action.";

    publishAction(
      id,
      status,
      command.kind,
      message,
    );

    throw new Error(message);
  }
}

export const RESERVATION_LIST_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
];

function reservationListDate(value) {
  if (!value) return "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      "Check-in filters must use valid calendar dates.",
    );
  }

  const date = new Date(value + "T00:00:00Z");

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      "Check-in filters must use valid calendar dates.",
    );
  }

  return value;
}

export function parseReservationListQuery(search) {
  if (
    typeof search !== "string" ||
    search.length > 2000
  ) {
    throw new Error("Reservation filters are invalid.");
  }

  const params = new URLSearchParams(search);

  const allowed = [
    "q",
    "status",
    "checkInFrom",
    "checkInTo",
    "page",
    "limit",
  ];

  for (const name of params.keys()) {
    if (
      !allowed.includes(name) ||
      params.getAll(name).length !== 1
    ) {
      throw new Error(
        "Reservation filters contain unsupported or repeated parameters.",
      );
    }
  }

  const q = (params.get("q") ?? "").trim();
  const status = params.get("status") ?? "";

  const checkInFrom = reservationListDate(
    params.get("checkInFrom") ?? "",
  );

  const checkInTo = reservationListDate(
    params.get("checkInTo") ?? "",
  );

  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "20";

  if (q.length > 100) {
    throw new Error(
      "Booking reference search must contain at most 100 characters.",
    );
  }

  if (
    status &&
    !RESERVATION_LIST_STATUSES.includes(status)
  ) {
    throw new Error("Choose a valid reservation status.");
  }

  if (
    checkInFrom &&
    checkInTo &&
    checkInFrom > checkInTo
  ) {
    throw new Error(
      "Check-in end date must be on or after its start date.",
    );
  }

  if (
    !/^\d+$/.test(pageText) ||
    !/^\d+$/.test(limitText)
  ) {
    throw new Error("Pagination values must be whole numbers.");
  }

  const page = Number(pageText);
  const limit = Number(limitText);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000 ||
    ![20, 50].includes(limit)
  ) {
    throw new Error(
      "Choose a page from 1 to 10000 and a page size of 20 or 50.",
    );
  }

  return {
    q,
    status,
    checkInFrom,
    checkInTo,
    page,
    limit,
  };
}

export function reservationListSearch(query) {
  const params = new URLSearchParams();

  for (const name of [
    "q",
    "status",
    "checkInFrom",
    "checkInTo",
  ]) {
    if (
      query[name] !== undefined &&
      query[name] !== null &&
      query[name] !== ""
    ) {
      params.set(name, String(query[name]));
    }
  }

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const normalized = parseReservationListQuery(
    params.toString(),
  );

  const result = new URLSearchParams();

  for (const name of [
    "q",
    "status",
    "checkInFrom",
    "checkInTo",
  ]) {
    if (normalized[name]) {
      result.set(name, normalized[name]);
    }
  }

  result.set("page", String(normalized.page));
  result.set("limit", String(normalized.limit));

  return result.toString();
}

export async function listReservationPage(query, signal) {
  const search = reservationListSearch(query);
  const expected = parseReservationListQuery(search);

  const response = await api.get(
    "/staff/reservations",
    {
      signal,
      params: new URLSearchParams(search),
    },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.limit !== expected.limit
  ) {
    throw new Error(
      "Reservation page is unavailable.",
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  const page = data.total === 0
    ? 1
    : Math.min(expected.page, totalPages);

  const expectedLength = Math.min(
    data.limit,
    Math.max(
      data.total - (page - 1) * data.limit,
      0,
    ),
  );

  if (
    data.page !== page ||
    data.totalPages !== totalPages ||
    data.items.length !== expectedLength ||
    !data.items.every(
      (item) =>
        reservation(item) &&
        RESERVATION_LIST_STATUSES.includes(item.status) &&
        Number.isSafeInteger(item.guestCount) &&
        item.guestCount > 0 &&
        typeof item.roomType.id === "string" &&
        typeof item.guest?.id === "string" &&
        typeof item.guest.firstName === "string" &&
        typeof item.guest.lastName === "string",
    )
  ) {
    throw new Error(
      "Reservation page is unavailable.",
    );
  }

  return data;
}