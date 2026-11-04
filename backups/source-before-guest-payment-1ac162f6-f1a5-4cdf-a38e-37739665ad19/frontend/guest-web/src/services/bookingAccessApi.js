import { api } from "./api.js";

const options = {
  withCredentials: true,
};

export async function requestBookingAccess(input) {
  const response = await api.post(
    "/reservations/access/request",
    input,
    options,
  );

  return response.data.data;
}

export async function exchangeBookingAccess(token) {
  await api.post(
    "/reservations/access/exchange",
    { token },
    options,
  );
}

export async function getCurrentBooking(signal) {
  const response = await api.get(
    "/reservations/access/current",
    {
      ...options,
      signal,
    },
  );

  return response.data.data;
}

export async function logoutBookingAccess() {
  await api.post(
    "/reservations/access/logout",
    {},
    options,
  );
}