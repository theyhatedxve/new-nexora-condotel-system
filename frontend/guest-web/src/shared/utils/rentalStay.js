export const RENTALS = {
  HOURLY: { label: "Hourly", unit: "hour", minutes: 60, max: 8 },
  NIGHTLY: { label: "Nightly", unit: "night", minutes: 1440, max: 30 },
  WEEKLY: { label: "Weekly (7 days)", unit: "week", minutes: 10080, max: 4 },
  MONTHLY: { label: "Monthly (30 days)", unit: "month", minutes: 43200, max: 1 },
};

function invalid(field, message) {
  const error = new Error(message);
  error.field = field;
  throw error;
}

export function rentalWindow(values) {
  const type = RENTALS[values.rentalType];
  if (!Object.hasOwn(RENTALS, values.rentalType)) {
    invalid("rentalType", "Choose a rental type.");
  }
  const units = Number(values.rentalUnits);
  if (!Number.isSafeInteger(units) || units < 1 || units > type.max) {
    invalid("rentalUnits", `Choose 1 to ${type.max} ${type.unit}s.`);
  }
  const date = values.checkIn;
  const marker = new Date(date + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      !Number.isFinite(marker.getTime()) || marker.toISOString().slice(0, 10) !== date) {
    invalid("checkIn", "Select a valid arrival date.");
  }
  const time = values.arrivalTime;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || "")) {
    invalid("arrivalTime", "Choose an arrival time in Philippine time.");
  }
  const [hour, minute] = time.split(":").map(Number);
  const startMinute = hour * 60 + minute;
  const duration = type.minutes * units;
  if (startMinute < 900) invalid("arrivalTime", "Scheduled arrival starts at 3 PM.");
  if (values.rentalType === "HOURLY" && startMinute + duration > 1380) {
    invalid("rentalUnits", "Hourly stays must finish by 11 PM.");
  }
  const start = new Date(date + "T" + time + ":00+08:00");
  const end = new Date(start.getTime() + duration * 60_000);
  const checkOut = new Date(end.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
  return { checkOut, start: start.toISOString(), end: end.toISOString() };
}

export function rentalSelection(values) {
  if (values?.rentalType === undefined && values?.rentalUnits === undefined) return {};
  rentalWindow(values);
  return {
    rentalType: values.rentalType,
    rentalUnits: Number(values.rentalUnits),
    arrivalTime: values.arrivalTime,
  };
}

export function rentalCaption(value) {
  const type = RENTALS[value?.rentalType];
  const units = value?.rentalUnits ?? value?.units;
  return type ? `${units} ${type.unit}${units === 1 ? "" : "s"}` : "";
}

export function formatRentalTime(value) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

export function readRental(value) {
  if (value?.rentalType == null) return null;
  if (!Object.hasOwn(RENTALS, value.rentalType)) throw new Error("Invalid rental response.");
  const units = value.rentalUnits ?? value.units;
  const rate = value.rentalRateCentavos ?? value.rateCentavos;
  const money = [rate, value.extraPersonFeeCentavos, value.accommodationCentavos,
    value.extraPersonTotalCentavos, value.totalAmountCentavos];
  if (
    !Number.isSafeInteger(units) || units < 1 || units > RENTALS[value.rentalType].max ||
    !Number.isSafeInteger(value.includedOccupancy) || value.includedOccupancy < 1 ||
    money.some((amount) => !Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647) ||
    rate < 1 || value.totalAmountCentavos < 1 ||
    value.accommodationCentavos !== rate * units ||
    value.totalAmountCentavos !== value.accommodationCentavos + value.extraPersonTotalCentavos
  ) throw new Error("Invalid rental pricing response.");
  const result = {
    rentalType: value.rentalType, rentalUnits: units, rentalRateCentavos: rate,
    includedOccupancy: value.includedOccupancy,
    extraPersonFeeCentavos: value.extraPersonFeeCentavos,
    accommodationCentavos: value.accommodationCentavos,
    extraPersonTotalCentavos: value.extraPersonTotalCentavos,
  };
  for (const field of ["scheduledArrivalAt", "scheduledDepartureAt",
    "inventoryStartAt", "inventoryEndAt", "actualArrivalAt", "actualDepartureAt"]) {
    const time = value[field] ?? null;
    if (time !== null && (typeof time !== "string" || !Number.isFinite(Date.parse(time)))) {
      throw new Error("Invalid rental timing response.");
    }
    result[field] = time;
  }
  const duration = RENTALS[result.rentalType].minutes * units * 60_000;
  if (!result.scheduledArrivalAt || !result.scheduledDepartureAt ||
      Date.parse(result.scheduledDepartureAt) - Date.parse(result.scheduledArrivalAt) !== duration) {
    throw new Error("Invalid scheduled rental interval.");
  }
  const hasInventory =
    result.inventoryStartAt !== null || result.inventoryEndAt !== null;
  if ("rentalRateCentavos" in value && !hasInventory) {
    throw new Error("Missing booked rental interval.");
  }
  if (hasInventory &&
      (!result.inventoryStartAt || !result.inventoryEndAt ||
       Date.parse(result.inventoryEndAt) <= Date.parse(result.inventoryStartAt))) {
    throw new Error("Invalid booked rental interval.");
  }
  if (result.actualArrivalAt !== null) {
    if (!hasInventory || Date.parse(result.inventoryStartAt) !== Date.parse(result.actualArrivalAt)) {
      throw new Error("Invalid actual check-in interval.");
    }
  } else if (hasInventory && (
    Date.parse(result.inventoryStartAt) !== Date.parse(result.scheduledArrivalAt) ||
    Date.parse(result.inventoryEndAt) !== Date.parse(result.scheduledDepartureAt)
  )) {
    throw new Error("Invalid pre-arrival rental interval.");
  }
  if (result.actualDepartureAt !== null && (
    !result.actualArrivalAt ||
    Date.parse(result.actualDepartureAt) < Date.parse(result.actualArrivalAt)
  )) {
    throw new Error("Invalid actual check-out timing.");
  }
  return result;
}
