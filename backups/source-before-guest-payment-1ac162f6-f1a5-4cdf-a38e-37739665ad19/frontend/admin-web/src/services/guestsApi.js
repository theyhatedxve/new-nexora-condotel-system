import api from "./api";

function guest(data) {
  return (
    data &&
    typeof data.id === "string" &&
    typeof data.firstName === "string" &&
    typeof data.lastName === "string" &&
    Number.isSafeInteger(data.reservationCount) &&
    data.reservationCount >= 0
  );
}

export async function listGuests(signal) {
  const response = await api.get(
    "/staff/guests",
    { signal },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.items.every(guest) ||
    data.limit !== 50 ||
    data.items.length > data.limit ||
    !Number.isSafeInteger(data.total) ||
    data.total < data.items.length
  ) {
    throw new Error("Guest list is unavailable.");
  }

  return data;
}

export async function getGuest(id, signal) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Invalid record.");
  }

  const response = await api.get(
    "/staff/guests/" + encodeURIComponent(id),
    { signal },
  );

  const data = response.data?.data;

  if (
    !guest(data) ||
    !Array.isArray(data.reservations) ||
    data.historyLimit !== 25 ||
    !(
      data.email === null ||
      typeof data.email === "string"
    ) ||
    !(
      data.phone === null ||
      typeof data.phone === "string"
    ) ||
    data.reservations.length > data.historyLimit ||
    data.reservations.length > data.reservationCount ||
    !data.reservations.every(
      (item) =>
        typeof item?.id === "string" &&
        typeof item.reservationNumber === "string" &&
        typeof item.status === "string" &&
        typeof item.checkInDate === "string" &&
        typeof item.checkOutDate === "string" &&
        typeof item.roomType?.name === "string",
    )
  ) {
    throw new Error(
      "Guest details are unavailable.",
    );
  }

  return data;
}

export function parseGuestListQuery(search) {
  if (
    typeof search !== "string" ||
    search.length > 2000
  ) {
    throw new Error("Guest search parameters are invalid.");
  }

  const params = new URLSearchParams(search);
  const allowed = ["q", "page", "limit"];

  for (const name of params.keys()) {
    if (
      !allowed.includes(name) ||
      params.getAll(name).length !== 1
    ) {
      throw new Error(
        "Guest search contains unsupported or repeated parameters.",
      );
    }
  }

  const q = (params.get("q") ?? "")
    .trim()
    .replace(/\s+/g, " ");

  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "20";

  if (q.length > 100) {
    throw new Error(
      "Guest search must contain at most 100 characters.",
    );
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

  return { q, page, limit };
}

export function guestListSearch(query) {
  const params = new URLSearchParams();

  if (
    query.q !== undefined &&
    query.q !== null &&
    query.q !== ""
  ) {
    params.set("q", String(query.q));
  }

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const normalized = parseGuestListQuery(
    params.toString(),
  );

  const result = new URLSearchParams();

  if (normalized.q) {
    result.set("q", normalized.q);
  }

  result.set("page", String(normalized.page));
  result.set("limit", String(normalized.limit));

  return result.toString();
}

export async function listGuestPage(query, signal) {
  const search = guestListSearch(query);
  const expected = parseGuestListQuery(search);

  const response = await api.get(
    "/staff/guests",
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
    throw new Error("Guest page is unavailable.");
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
        guest(item) &&
        item.reservationCount >= 1,
    )
  ) {
    throw new Error("Guest page is unavailable.");
  }

  return data;
}