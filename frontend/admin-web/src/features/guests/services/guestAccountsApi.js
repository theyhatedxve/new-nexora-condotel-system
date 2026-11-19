import api from "../../../shared/services/api.js";

export const GUEST_ACCOUNT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "DISABLED",
];

export const GUEST_ACCOUNT_STATUS_LABELS = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export async function listGuestAccounts(params, signal) {
  const response = await api.get("/staff/guest-accounts", {
    params: {
      ...params,
      q: params.q || undefined,
      status: params.status || undefined,
    },
    signal,
  });

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.limit !== params.limit
  ) {
    throw new Error("Guest accounts could not be loaded.");
  }

  const totalPages = Math.ceil(data.total / data.limit);
  const page = data.total === 0
    ? 1
    : Math.min(params.page, totalPages);

  const expectedLength = Math.min(
    data.limit,
    Math.max(data.total - (page - 1) * data.limit, 0),
  );

  if (
    data.page !== page ||
    data.totalPages !== totalPages ||
    data.items.length !== expectedLength ||
    !data.items.every(
      (item) =>
        typeof item?.id === "string" &&
        typeof item.name === "string" &&
        typeof item.email === "string" &&
        GUEST_ACCOUNT_STATUSES.includes(item.status) &&
        typeof item.createdAt === "string" &&
        Number.isFinite(Date.parse(item.createdAt)),
    )
  ) {
    throw new Error("Guest accounts could not be loaded.");
  }

  return data;
}