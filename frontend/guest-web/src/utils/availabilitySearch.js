const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatCentavos(amount) {
  return moneyFormatter.format(amount / 100);
}

export function getPhilippineToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (name) => parts.find((part) => part.type === name)?.value;

  return [getPart("year"), getPart("month"), getPart("day")].join("-");
}

export function differenceInNights(checkIn, checkOut) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);

  return Math.round((end - start) / 86400000);
}

export function validateSearch({ checkIn, checkOut, guests }) {
  if (!checkIn || !checkOut) {
    return "Please select check-in and check-out dates.";
  }

  if (checkIn < getPhilippineToday()) {
    return "Check-in cannot be in the past.";
  }

  const nights = differenceInNights(checkIn, checkOut);

  if (!Number.isInteger(nights) || nights < 1) {
    return "Check-out must be later than check-in.";
  }

  if (nights > 30) {
    return "The maximum stay is 30 nights.";
  }

  if (!Number.isSafeInteger(guests) || guests < 1) {
    return "Please enter at least one guest.";
  }

  return "";
}
