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