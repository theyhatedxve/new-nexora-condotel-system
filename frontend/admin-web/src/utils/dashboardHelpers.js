import { listReservationPage } from "../services/reservationsApi";

export function loadRecentReservations(_staffScope, signal) {
  // The existing API supports 20 or 50 rows; display only its newest five.
  return listReservationPage({ page: 1, limit: 20 }, signal);
}
