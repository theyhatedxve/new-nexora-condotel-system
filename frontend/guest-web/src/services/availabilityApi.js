
import { api } from "./api.js";

export async function searchAvailability(
  { checkIn, checkOut, guests },
  signal,
) {
  const response = await api.get("/availability", {
    params: {
      checkIn,
      checkOut,
      guests,
    },
    signal,
  });

  if (!Array.isArray(response.data?.data)) {
    throw new Error("Unexpected availability response.");
  }

  return response.data.data;
}
