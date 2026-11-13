import { useEffect, useState } from "react";
import { getAccountBooking } from "../services/accountBookingsApi.js";
import { getMyBookingById } from "../services/guestReservationsApi.js";

export default function usePrivateBooking(target = null) {
  const reservationId =
    target && typeof target === "object" ? target.reservationId ?? null : null;
  const expectedReference =
    typeof target === "string"
      ? target
      : target && typeof target === "object"
        ? target.expectedReference ?? null
        : null;

  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", booking: null });

  useEffect(() => {
    const controller = new AbortController();

    if (!reservationId && !expectedReference) {
      setState({ status: "unavailable", booking: null });
      return () => controller.abort();
    }

    setState({ status: "loading", booking: null });

    const request = reservationId
      ? getMyBookingById(reservationId, controller.signal)
      : getAccountBooking(expectedReference, controller.signal);

    request.then(
      (booking) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", booking });
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setState({
            status: error.response?.status === 404 ? "unavailable" : "error",
            booking: null,
          });
        }
      },
    );

    return () => controller.abort();
  }, [reservationId, expectedReference, revision]);

  function refresh() {
    setState({ status: "loading", booking: null });
    setRevision((value) => value + 1);
  }

  return { ...state, revision, refresh };
}
