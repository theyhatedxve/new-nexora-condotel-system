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

const collectionMaximum = 2_147_483_647;

export function parsePropertyCollectionAmount(value) {
  if (
    typeof value !== "string" ||
    !/^\d{1,8}(?:\.\d{1,2})?$/.test(value.trim())
  ) {
    throw new Error(
      "Enter pesos with up to two decimal places, without commas.",
    );
  }

  const [whole, fraction = ""] = value.trim().split(".");

  const amount =
    Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"));

  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > collectionMaximum
  ) {
    throw new Error(
      "Amount must be between PHP 0.01 and PHP 21,474,836.47.",
    );
  }

  return amount;
}

export async function propertyCollectionReceiptId(requestId) {
  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new Error("Invalid collection request identifier.");
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Collection recording requires a secure browser context.",
    );
  }

  const bytes = new TextEncoder().encode(
    "pay-at-property:" + requestId.toLowerCase(),
  );

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes,
  );

  return (
    "pap_" +
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}

export async function recordPropertyCollection(
  intent,
  reservationNumber,
) {
  const expectedId = await propertyCollectionReceiptId(
    intent.requestId,
  );

  if (
    intent.receiptId !== expectedId ||
    !Number.isSafeInteger(intent.amountCentavos) ||
    intent.amountCentavos < 1 ||
    intent.amountCentavos > collectionMaximum
  ) {
    throw new Error("The original collection requires review.");
  }

  const response = await api.post(
    "/payments/reservations/" +
      pathId(intent.reservationId) +
      "/pay-at-property",
    {
      requestId: intent.requestId,
      amountCentavos: intent.amountCentavos,
      collectionConfirmed: true,
    },
  );

  const data = response.data?.data;
  const receipt = data?.receipt;

  if (
    data?.reservationNumber !== reservationNumber ||
    ![
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "CHECKED_OUT",
      "CANCELLED",
      "EXPIRED",
    ].includes(data.reservationStatus) ||
    typeof data.alreadyRecorded !== "boolean" ||
    !bookingSummary(data.summary) ||
    receipt?.id !== expectedId ||
    receipt.method !== "PAY_AT_PROPERTY" ||
    receipt.status !== "PAID" ||
    receipt.currency !== "PHP" ||
    receipt.amountCentavos !== intent.amountCentavos ||
    typeof receipt.paidAt !== "string" ||
    !Number.isFinite(Date.parse(receipt.paidAt))
  ) {
    throw new Error(
      "The response could not confirm the original collection.",
    );
  }

  return {
    id: receipt.id,
    amountCentavos: receipt.amountCentavos,
    alreadyRecorded: data.alreadyRecorded,
  };
}

export async function findPropertyCollection(intent) {
  const expectedId = await propertyCollectionReceiptId(
    intent.requestId,
  );

  if (intent.receiptId !== expectedId) {
    throw new Error("The saved collection requires review.");
  }

  const data = await getPayment(expectedId);

  if (
    data.reservation.id !== intent.reservationId ||
    data.method !== "PAY_AT_PROPERTY" ||
    data.currency !== "PHP" ||
    data.amountCentavos !== intent.amountCentavos ||
    ![
      "PAID",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
    ].includes(data.status) ||
    typeof data.paidAt !== "string" ||
    !Number.isFinite(Date.parse(data.paidAt))
  ) {
    throw new Error(
      "The existing receipt does not match the original collection.",
    );
  }

  return {
    id: data.id,
    amountCentavos: data.amountCentavos,
    requiresReview:
      data.requiresReview ||
      data.bookingRequiresReview,
  };
}

export const PAYMENT_LIST_METHODS = [
  "PAYMONGO",
  "PAY_AT_PROPERTY",
];

export const PAYMENT_LIST_STATUSES = [
  "UNPAID",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

export function parsePaymentListQuery(search) {
  if (
    typeof search !== "string" ||
    search.length > 2000
  ) {
    throw new Error("Payment filters are invalid.");
  }

  const params = new URLSearchParams(search);

  const allowed = [
    "q",
    "method",
    "status",
    "page",
    "limit",
  ];

  for (const name of params.keys()) {
    if (
      !allowed.includes(name) ||
      params.getAll(name).length !== 1
    ) {
      throw new Error(
        "Payment filters contain unsupported or repeated parameters.",
      );
    }
  }

  const q = (params.get("q") ?? "").trim();
  const method = params.get("method") ?? "";
  const status = params.get("status") ?? "";

  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "20";

  if (q.length > 100) {
    throw new Error(
      "Booking reference search must contain at most 100 characters.",
    );
  }

  if (
    method &&
    !PAYMENT_LIST_METHODS.includes(method)
  ) {
    throw new Error("Choose a valid payment method.");
  }

  if (
    status &&
    !PAYMENT_LIST_STATUSES.includes(status)
  ) {
    throw new Error("Choose a valid stored payment status.");
  }

  if (
    !/^\d+$/.test(pageText) ||
    !/^\d+$/.test(limitText)
  ) {
    throw new Error(
      "Pagination values must be whole numbers.",
    );
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
    method,
    status,
    page,
    limit,
  };
}

export function paymentListSearch(query) {
  const params = new URLSearchParams();

  for (const name of ["q", "method", "status"]) {
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

  const normalized = parsePaymentListQuery(
    params.toString(),
  );

  const result = new URLSearchParams();

  for (const name of ["q", "method", "status"]) {
    if (normalized[name]) {
      result.set(name, normalized[name]);
    }
  }

  result.set("page", String(normalized.page));
  result.set("limit", String(normalized.limit));

  return result.toString();
}

export async function listPaymentPage(query, signal) {
  const search = paymentListSearch(query);
  const expected = parsePaymentListQuery(search);

  const response = await api.get(
    "/staff/payments",
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
    throw new Error("Payment page is unavailable.");
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
        payment(item) &&
        PAYMENT_LIST_METHODS.includes(item.method) &&
        PAYMENT_LIST_STATUSES.includes(item.status),
    )
  ) {
    throw new Error("Payment page is unavailable.");
  }

  return data;
}