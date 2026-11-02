import api from "./api";
import { getSession } from "./authApi";
import { getPayment } from "./paymentsApi";

const limit = 20;

const paymentStatuses = [
  "UNPAID",
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

const eventStatuses = [
  "RECEIVED",
  "PROCESSED",
  "IGNORED",
  "FAILED",
];

function reference(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200
  );
}

function optionalReference(value) {
  return value === null || reference(value);
}

function timestamp(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

function amount(value) {
  return (
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 2_147_483_647
  );
}

function reviewLabel(value) {
  switch (value) {
    case "STALE_DELIVERY":
      return "Stale delivery";

    case "REFUND_UNMATCHED":
      return "Refund not matched";

    case "PROVIDER_STATE_CONFLICT":
      return "Provider state conflict";

    default:
      return value
        ? "Review note recorded"
        : "Event selected for review";
  }
}

export async function listReconciliation(signal) {
  const response = await api.get(
    "/payments/reconciliation",
    {
      signal,
      params: {
        offset: 0,
        limit,
      },
    },
  );

  const data = response.data?.data;

  if (
    !data ||
    data.offset !== 0 ||
    data.limit !== limit ||
    !Array.isArray(data.payments) ||
    !Array.isArray(data.refunds) ||
    !Array.isArray(data.events) ||
    data.payments.length > limit ||
    data.refunds.length > limit ||
    data.events.length > limit ||
    !data.payments.every(
      (item) =>
        reference(item?.id) &&
        reference(item.reservationId) &&
        paymentStatuses.includes(item.status) &&
        (
          item.checkoutState === null ||
          [
            "CREATING",
            "READY",
            "UNKNOWN",
          ].includes(item.checkoutState)
        ) &&
        amount(item.amountCentavos) &&
        typeof item.currency === "string" &&
        /^[A-Z]{3}$/.test(item.currency) &&
        timestamp(item.createdAt),
    ) ||
    !data.refunds.every(
      (item) =>
        reference(item?.id) &&
        reference(item.paymentId) &&
        optionalReference(item.providerRefundId) &&
        item.status === "PENDING" &&
        amount(item.amountCentavos) &&
        timestamp(item.requestedAt),
    ) ||
    !data.events.every(
      (item) =>
        reference(item?.providerEventId) &&
        optionalReference(item.paymentId) &&
        reference(item.eventType) &&
        eventStatuses.includes(item.status) &&
        (
          item.errorMessage === null ||
          typeof item.errorMessage === "string"
        ) &&
        timestamp(item.createdAt),
    )
  ) {
    throw new Error(
      "Reconciliation records are unavailable.",
    );
  }

  return {
    limit: data.limit,

    payments: data.payments.map((item) => ({
      id: item.id,
      reservationId: item.reservationId,
      status: item.status,
      checkoutState: item.checkoutState,
      amountCentavos: item.amountCentavos,
      currency: item.currency,
      createdAt: item.createdAt,
    })),

    refunds: data.refunds.map((item) => ({
      id: item.id,
      paymentId: item.paymentId,
      providerRefundId: item.providerRefundId,
      status: item.status,
      amountCentavos: item.amountCentavos,
      requestedAt: item.requestedAt,
    })),

    events: data.events.map((item) => ({
      providerEventId: item.providerEventId,
      paymentId: item.paymentId,
      eventType: item.eventType,
      status: item.status,
      reviewReason: reviewLabel(item.errorMessage),
      createdAt: item.createdAt,
    })),
  };
}

export const RECONCILIATION_OUTCOMES = Object.freeze({
  PROCESSED:
    "Reconciliation was processed. Check the current financial records below.",

  DUPLICATE:
    "The reconciliation returned a duplicate outcome. Check the current records.",

  IGNORED:
    "The record was ignored under the reconciliation rules.",

  REVIEW_REQUIRED:
    "Financial review is still required.",

  PROVIDER_REFERENCE_REQUIRED:
    "An existing provider refund reference is required. Review this result before preparing a new request.",
});

function reconciliationId(value, label) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 100
  ) {
    throw new Error("Choose a valid " + label + ".");
  }

  return value.trim();
}

function reconciliationActor(actorId) {
  const session = getSession();

  if (
    session.status !== "authenticated" ||
    session.user?.id !== actorId ||
    !["ADMIN", "MANAGER"].includes(session.user?.role)
  ) {
    throw new Error(
      "Use the original authorized staff account.",
    );
  }
}

export function normalizeReconciliationInput(input) {
  if (!["payment", "refund"].includes(input.kind)) {
    throw new Error("Choose a reconciliation operation.");
  }

  const targetId = reconciliationId(
    input.targetId,
    "target record",
  );

  if (input.kind === "payment") {
    const eventId = input.eventId?.trim();

    if (
      !/^evt_[A-Za-z0-9_]{1,96}$/.test(eventId ?? "") ||
      (
        input.acknowledgeLateCapture !== undefined &&
        typeof input.acknowledgeLateCapture !== "boolean"
      ) ||
      input.providerRefundId !== undefined
    ) {
      throw new Error(
        "Enter an existing paid-event reference and valid acknowledgment.",
      );
    }

    return {
      kind: "payment",
      targetId,
      paymentId: targetId,
      eventId,
      acknowledgeLateCapture:
        input.acknowledgeLateCapture === true,
    };
  }

  const paymentId = reconciliationId(
    input.paymentId,
    "related payment",
  );

  const providerRefundId =
    input.providerRefundId?.trim() || undefined;

  if (
    input.eventId !== undefined ||
    input.acknowledgeLateCapture !== undefined ||
    (
      providerRefundId !== undefined &&
      !/^ref_[A-Za-z0-9_]{1,96}$/.test(providerRefundId)
    )
  ) {
    throw new Error(
      "Enter a valid existing provider refund reference.",
    );
  }

  return {
    kind: "refund",
    targetId,
    paymentId,
    providerRefundId,
  };
}

function reconciliationRequestId(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error(
      "Invalid reconciliation request reference.",
    );
  }

  return value.toLowerCase();
}

function reconciliationResult(data, intent, statusRead) {
  if (
    data?.id !== intent.targetId ||
    !Object.hasOwn(
      RECONCILIATION_OUTCOMES,
      data.outcome,
    ) ||
    typeof data.alreadyReconciled !== "boolean" ||
    (
      statusRead &&
      (
        data.requestId !== intent.requestId ||
        data.kind !== intent.kind
      )
    )
  ) {
    throw new Error(
      "The original reconciliation outcome could not be confirmed.",
    );
  }

  return {
    requestId: intent.requestId,
    kind: intent.kind,
    id: data.id,
    outcome: data.outcome,
    alreadyReconciled: data.alreadyReconciled,
  };
}

export async function submitReconciliation(intent) {
  const input = normalizeReconciliationInput(intent);
  const requestId = reconciliationRequestId(intent.requestId);

  reconciliationActor(intent.actorId);

  const path = input.kind === "payment"
    ? (
        "/payments/" +
        encodeURIComponent(input.targetId) +
        "/reconcile"
      )
    : (
        "/payments/refunds/" +
        encodeURIComponent(input.targetId) +
        "/reconcile"
      );

  const body = input.kind === "payment"
    ? {
        requestId,
        eventId: input.eventId,
        acknowledgeLateCapture:
          input.acknowledgeLateCapture,
      }
    : {
        requestId,
        ...(input.providerRefundId
          ? { providerRefundId: input.providerRefundId }
          : {}),
      };

  const response = await api.post(path, body);

  return reconciliationResult(
    response.data?.data,
    { ...input, requestId },
    false,
  );
}

export async function getReconciliationRequestStatus(intent) {
  const input = normalizeReconciliationInput(intent);
  const requestId = reconciliationRequestId(intent.requestId);

  reconciliationActor(intent.actorId);

  const params = input.kind === "payment"
    ? {
        kind: input.kind,
        targetId: input.targetId,
        eventId: input.eventId,
        acknowledgeLateCapture:
          input.acknowledgeLateCapture ? "true" : "false",
      }
    : {
        kind: input.kind,
        targetId: input.targetId,
        ...(input.providerRefundId
          ? { providerRefundId: input.providerRefundId }
          : {}),
      };

  const response = await api.get(
    "/payments/reconciliation/requests/" +
      encodeURIComponent(requestId),
    { params },
  );

  return reconciliationResult(
    response.data?.data,
    { ...input, requestId },
    true,
  );
}

export async function getReconciliationFinancialRecords(intent) {
  const input = normalizeReconciliationInput(intent);

  reconciliationActor(intent.actorId);

  let refundStatus = null;

  if (input.kind === "refund") {
    const response = await api.get(
      "/payments/refunds/" +
        encodeURIComponent(input.targetId),
    );

    const refund = response.data?.data?.refund;

    if (
      refund?.id !== input.targetId ||
      refund.paymentId !== input.paymentId ||
      ![
        "PENDING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ].includes(refund.status)
    ) {
      throw new Error(
        "Current refund details could not be confirmed.",
      );
    }

    refundStatus = refund.status;
  }

  reconciliationActor(intent.actorId);

  const payment = await getPayment(input.paymentId);

  if (payment.method !== "PAYMONGO") {
    throw new Error(
      "The related payment requires review.",
    );
  }

  return { payment, refundStatus };
}