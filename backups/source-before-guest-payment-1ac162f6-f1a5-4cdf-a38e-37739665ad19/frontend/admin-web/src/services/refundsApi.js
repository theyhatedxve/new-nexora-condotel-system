import api from "./api";
import { getSession } from "./authApi";

export {
  parsePropertyCollectionAmount as parseRefundAmount,
} from "./paymentsApi";

export const CASH_REFUND_REASONS = [
  {
    value: "duplicate",
    label: "Duplicate payment",
  },
  {
    value: "fraudulent",
    label: "Fraudulent payment",
  },
  {
    value: "requested_by_customer",
    label: "Requested by customer",
  },
  {
    value: "others",
    label: "Others",
  },
];

function assertActor(actorId) {
  const session = getSession();

  if (
    session.status !== "authenticated" ||
    session.user?.id !== actorId ||
    !["ADMIN", "MANAGER"].includes(session.user?.role)
  ) {
    throw new Error(
      "Sign in with the original authorized account.",
    );
  }
}

function pathId(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 100
  ) {
    throw new Error("Invalid refund record.");
  }

  return encodeURIComponent(value);
}

export async function cashRefundRecordId(requestId) {
  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new Error("Invalid refund request identifier.");
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Refund recording requires a secure browser context.",
    );
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      "refund:" + requestId.toLowerCase(),
    ),
  );

  return (
    "rfd_" +
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}

function validateRefund(data, intent) {
  const refund = data?.refund;

  if (
    refund?.id !== intent.refundId ||
    refund.paymentId !== intent.paymentId ||
    refund.status !== "COMPLETED" ||
    refund.currency !== "PHP" ||
    refund.amountCentavos !== intent.amountCentavos ||
    refund.reason !== intent.reason ||
    typeof refund.requestedAt !== "string" ||
    !Number.isFinite(Date.parse(refund.requestedAt)) ||
    typeof refund.completedAt !== "string" ||
    !Number.isFinite(Date.parse(refund.completedAt)) ||
    typeof data.reservationNumber !== "string" ||
    typeof data.alreadyRecorded !== "boolean"
  ) {
    throw new Error(
      "The response could not confirm the original completed refund.",
    );
  }

  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amountCentavos: refund.amountCentavos,
    reason: refund.reason,
    requestedAt: refund.requestedAt,
    completedAt: refund.completedAt,
    alreadyRecorded: data.alreadyRecorded,
  };
}

async function assertIntent(intent) {
  const expectedId = await cashRefundRecordId(
    intent.requestId,
  );

  if (
    intent.refundId !== expectedId ||
    !Number.isSafeInteger(intent.amountCentavos) ||
    intent.amountCentavos < 1 ||
    intent.amountCentavos > 2_147_483_647 ||
    !CASH_REFUND_REASONS.some(
      (reason) => reason.value === intent.reason,
    )
  ) {
    throw new Error("The original refund requires review.");
  }

  pathId(intent.paymentId);
  assertActor(intent.actorId);
}

export async function recordCashRefund(intent) {
  await assertIntent(intent);

  const response = await api.post(
    "/payments/" +
      pathId(intent.paymentId) +
      "/refunds",
    {
      requestId: intent.requestId,
      amountCentavos: intent.amountCentavos,
      reason: intent.reason,
      cashReturnedConfirmed: true,
    },
  );

  return validateRefund(response.data?.data, intent);
}

export async function findCashRefund(intent) {
  await assertIntent(intent);

  const response = await api.get(
    "/payments/refunds/" + pathId(intent.refundId),
  );

  return validateRefund(response.data?.data, intent);
}