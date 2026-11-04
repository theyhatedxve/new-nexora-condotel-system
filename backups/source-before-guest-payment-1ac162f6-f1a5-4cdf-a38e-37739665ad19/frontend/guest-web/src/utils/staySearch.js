const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_GUESTS = 2147483647;

export function getPhilippineToday(now = new Date()) {
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
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function guestNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value)
  ) {
    return Number.NaN;
  }

  return Number(value);
}

export function stayNights(checkIn, checkOut) {
  const start = calendarDate(checkIn);
  const end = calendarDate(checkOut);

  if (!start || !end) {
    return Number.NaN;
  }

  return (
    end.getTime() - start.getTime()
  ) / DAY_MS;
}

export function validateStaySearch(
  values,
  today = getPhilippineToday(),
) {
  const errors = {};

  const checkIn =
    typeof values?.checkIn === "string"
      ? values.checkIn
      : "";

  const checkOut =
    typeof values?.checkOut === "string"
      ? values.checkOut
      : "";

  const guests = guestNumber(values?.guests);

  const start = calendarDate(checkIn);
  const end = calendarDate(checkOut);

  if (!start) {
    errors.checkIn =
      "Select a valid check-in date.";
  } else if (checkIn < today) {
    errors.checkIn =
      "Check-in cannot be in the past.";
  }

  if (!end) {
    errors.checkOut =
      "Select a valid check-out date.";
  } else if (start) {
    const nights = stayNights(
      checkIn,
      checkOut,
    );

    if (nights < 1) {
      errors.checkOut =
        "Check-out must be after check-in.";
    } else if (nights > 30) {
      errors.checkOut =
        "A stay cannot exceed 30 nights.";
    }
  }

  if (
    !Number.isSafeInteger(guests) ||
    guests < 1 ||
    guests > MAX_GUESTS
  ) {
    errors.guests =
      `Enter a whole guest count from 1 to ${MAX_GUESTS}.`;
  }

  return {
    errors,
    value:
      Object.keys(errors).length === 0
        ? { checkIn, checkOut, guests }
        : null,
  };
}

export function staySearchParams(values) {
  const checked = validateStaySearch(values);

  if (!checked.value) {
    throw new Error(
      Object.values(checked.errors)[0],
    );
  }

  return new URLSearchParams({
    checkIn: checked.value.checkIn,
    checkOut: checked.value.checkOut,
    guests: String(checked.value.guests),
  }).toString();
}

export function parseStaySearch(
  search,
  today = getPhilippineToday(),
) {
  if (
    typeof search !== "string" ||
    search.length > 512
  ) {
    throw new Error(
      "The stay-search URL is invalid.",
    );
  }

  const params = new URLSearchParams(search);

  if (params.toString() === "") {
    return null;
  }

  const allowed = new Set([
    "checkIn",
    "checkOut",
    "guests",
  ]);

  for (const key of params.keys()) {
    if (
      !allowed.has(key) ||
      params.getAll(key).length !== 1
    ) {
      throw new Error(
        "The stay-search URL contains unsupported or repeated parameters.",
      );
    }
  }

  if (
    !params.has("checkIn") ||
    !params.has("checkOut") ||
    !params.has("guests")
  ) {
    throw new Error(
      "Provide check-in, check-out, and guests together.",
    );
  }

  const checked = validateStaySearch(
    {
      checkIn: params.get("checkIn"),
      checkOut: params.get("checkOut"),
      guests: params.get("guests"),
    },
    today,
  );

  if (!checked.value) {
    throw new Error(
      Object.values(checked.errors)[0],
    );
  }

  return checked.value;
}