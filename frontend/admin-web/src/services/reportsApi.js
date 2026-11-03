import api from "./api";

const DAY_MS = 24 * 60 * 60 * 1000;

export function reportToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type) =>
    parts.find((entry) => entry.type === type)?.value;

  return [
    part("year"),
    part("month"),
    part("day"),
  ].join("-");
}

function calendarDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(
      "Use valid dates in YYYY-MM-DD format.",
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

export function validateReportRange(
  from,
  to,
  today = reportToday(),
) {
  const first = calendarDate(from);
  const last = calendarDate(to);
  const current = calendarDate(today);

  if (first > last) {
    throw new Error(
      "From date must not be after To date.",
    );
  }

  if (last > current) {
    throw new Error(
      "Report dates must not be in the future.",
    );
  }

  const days =
    (last.getTime() - first.getTime()) /
      DAY_MS + 1;

  if (days > 31) {
    throw new Error(
      "Select no more than 31 calendar days.",
    );
  }

  return { from, to, days };
}

export function parseReportQuery(
  search,
  today = reportToday(),
) {
  if (
    typeof search !== "string" ||
    search.length > 256
  ) {
    throw new Error(
      "The report URL is invalid.",
    );
  }

  const params = new URLSearchParams(search);
  const allowed = new Set(["from", "to"]);

  for (const key of params.keys()) {
    if (
      !allowed.has(key) ||
      params.getAll(key).length !== 1
    ) {
      throw new Error(
        "The report URL contains unsupported or repeated filters.",
      );
    }
  }

  if (params.has("from") !== params.has("to")) {
    throw new Error(
      "Provide both From and To dates.",
    );
  }


  return validateReportRange(
    params.get("from") ?? today,
    params.get("to") ?? today,
    today,
  );
}

export function reportSearch(query) {
  const range = validateReportRange(
    query.from,
    query.to,
  );

  return new URLSearchParams({
    from: range.from,
    to: range.to,
  }).toString();
}

export async function getCollectionsReport(
  query,
  signal,
) {
  const range = validateReportRange(
    query.from,
    query.to,
  );

  const response = await api.get(
    "/reports/collections",
    {
      params: {
        from: range.from,
        to: range.to,
      },
      signal,
    },
  );

  const data = response.data?.data;

  const amounts = [
    "collectionsCentavos",
    "refundsCentavos",
    "netCollectionsCentavos",
  ];

  const ready =
    data?.status === "READY" &&
    amounts.every((key) =>
      Number.isSafeInteger(data[key]),
    ) &&
    data.collectionsCentavos >= 0 &&
    data.refundsCentavos >= 0 &&
    data.netCollectionsCentavos ===
      data.collectionsCentavos -
        data.refundsCentavos;

  const review =
    data?.status === "REVIEW_REQUIRED" &&
    amounts.every((key) => data[key] === null);

  if (
    !data ||
    data.from !== range.from ||
    data.to !== range.to ||
    data.days !== range.days ||
    data.timezone !== "Asia/Manila" ||
    data.currency !== "PHP" ||
    typeof data.asOf !== "string" ||
    !Number.isFinite(Date.parse(data.asOf)) ||
    (!ready && !review)
  ) {
    throw new Error(
      "The collections report is unavailable.",
    );
  }

  return {
    from: data.from,
    to: data.to,
    days: data.days,
    asOf: data.asOf,
    timezone: data.timezone,
    currency: data.currency,
    status: data.status,
    collectionsCentavos: data.collectionsCentavos,
    refundsCentavos: data.refundsCentavos,
    netCollectionsCentavos:
      data.netCollectionsCentavos,
  };
}