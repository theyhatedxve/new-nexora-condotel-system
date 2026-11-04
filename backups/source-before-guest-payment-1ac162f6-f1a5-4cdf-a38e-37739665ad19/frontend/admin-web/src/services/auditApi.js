import api from "./api";

function calendarDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(
      "Use dates in YYYY-MM-DD format.",
    );
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      "Use valid calendar dates.",
    );
  }

  return date;
}

function integer(value, fallback) {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      "Audit pagination is invalid.",
    );
  }

  const result = Number(value);

  if (!Number.isSafeInteger(result)) {
    throw new Error(
      "Audit pagination is invalid.",
    );
  }

  return result;
}

export function parseAuditQuery(search) {
  if (
    typeof search !== "string" ||
    search.length > 2000
  ) {
    throw new Error(
      "The audit URL is invalid.",
    );
  }

  const params = new URLSearchParams(search);

  const allowed = new Set([
    "from",
    "to",
    "action",
    "entityType",
    "page",
    "limit",
  ]);

  for (const key of params.keys()) {
    if (
      !allowed.has(key) ||
      params.getAll(key).length !== 1
    ) {
      throw new Error(
        "The audit URL contains unsupported or repeated filters.",
      );
    }
  }

  if (params.has("from") !== params.has("to")) {
    throw new Error(
      "Provide both From and To dates.",
    );
  }

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  if (params.has("from")) {
    const first = calendarDate(from);
    const last = calendarDate(to);

    if (first > last) {
      throw new Error(
        "From date must not be after To date.",
      );
    }
  }

  const action =
    (params.get("action") ?? "").trim();

  const entityType =
    (params.get("entityType") ?? "").trim();

  if (
    action.length > 100 ||
    entityType.length > 100
  ) {
    throw new Error(
      "Action and record type must each be 100 characters or fewer.",
    );
  }

  const page = integer(
    params.get("page"),
    1,
  );

  const limit = integer(
    params.get("limit"),
    20,
  );

  if (
    page < 1 ||
    page > 10000 ||
    ![20, 50].includes(limit)
  ) {
    throw new Error(
      "Use pages from 1 to 10000 and a page size of 20 or 50.",
    );
  }

  return {
    from,
    to,
    action,
    entityType,
    page,
    limit,
  };
}

export function auditSearch(query) {
  const params = new URLSearchParams();

  if (query.from || query.to) {
    params.set("from", query.from ?? "");
    params.set("to", query.to ?? "");
  }

  if (query.action) {
    params.set("action", query.action);
  }

  if (query.entityType) {
    params.set("entityType", query.entityType);
  }

  params.set(
    "page",
    String(query.page ?? 1),
  );

  params.set(
    "limit",
    String(query.limit ?? 20),
  );

  const checked = parseAuditQuery(
    params.toString(),
  );

  if (checked.action) {
    params.set("action", checked.action);
  } else {
    params.delete("action");
  }

  if (checked.entityType) {
    params.set(
      "entityType",
      checked.entityType,
    );
  } else {
    params.delete("entityType");
  }

  params.set("page", String(checked.page));
  params.set("limit", String(checked.limit));

  return params.toString();
}

function requiredText(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function nullableText(value) {
  return (
    value === null ||
    requiredText(value)
  );
}

export async function listAuditPage(
  query,
  signal,
) {
  const checked = parseAuditQuery(
    auditSearch(query),
  );

  const response = await api.get(
    "/audit-logs",
    {
      params: {
        from: checked.from || undefined,
        to: checked.to || undefined,
        action: checked.action || undefined,
        entityType:
          checked.entityType || undefined,
        page: checked.page,
        limit: checked.limit,
      },
      signal,
    },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.limit !== checked.limit ||
    !Array.isArray(data.items)
  ) {
    throw new Error(
      "Audit history is unavailable.",
    );
  }

  const totalPages = Math.ceil(
    data.total / checked.limit,
  );

  const expectedPage =
    data.total === 0
      ? 1
      : Math.min(
          checked.page,
          totalPages,
        );

  const expectedLength = Math.min(
    checked.limit,
    Math.max(
      0,
      data.total -
        (expectedPage - 1) * checked.limit,
    ),
  );

  if (
    data.totalPages !== totalPages ||
    data.page !== expectedPage ||
    data.items.length !== expectedLength
  ) {
    throw new Error(
      "Audit pagination is unavailable.",
    );
  }

  const items = data.items.map((item) => {
    if (
      !item ||
      !requiredText(item.id) ||
      !requiredText(item.action) ||
      !requiredText(item.entityType) ||
      !nullableText(item.entityId) ||
      !nullableText(item.actorUserId) ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(
        Date.parse(item.createdAt),
      )
    ) {
      throw new Error(
        "Audit history is unavailable.",
      );
    }

    return {
      id: item.id,
      createdAt: item.createdAt,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      actorUserId: item.actorUserId,
    };
  });

  if (
    new Set(items.map((item) => item.id)).size !==
    items.length
  ) {
    throw new Error(
      "Audit history is unavailable.",
    );
  }

  return {
    items,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
  };
}