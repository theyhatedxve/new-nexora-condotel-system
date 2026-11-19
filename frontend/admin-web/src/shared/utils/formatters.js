export function guestName(guest) {
  return (
    [guest?.firstName, guest?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed guest"
  );
}

export function formatStatus(value) {
  if (typeof value !== "string" || !value) {
    return "Unknown";
  }

  const text = value
    .toLowerCase()
    .replaceAll("_", " ");

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPesos(value) {
  if (value === null) return "Not applicable";

  if (!Number.isSafeInteger(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value / 100);
}

export function formatStayDate(value) {
  if (typeof value !== "string") {
    return "Not recorded";
  }

  const text = value.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return "Not recorded";
  }

  const date = new Date(text + "T00:00:00Z");

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimestamp(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}