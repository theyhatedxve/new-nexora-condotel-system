import { useEffect, useMemo, useState } from "react";
import { getAccountBooking } from "../services/accountBookingsApi.js";
import { getMyBookingById } from "../services/guestReservationsApi.js";

export default function usePrivateBooking(target = null) {
  const reservationId =
    target && typeof target === "object"
      ? target.reservationId ?? null
      : null;

  const expectedReference =
    typeof target === "string"
      ? target
      : target && typeof target === "object"
        ? target.expectedReference ?? null
        : null;

  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);

  const request = useMemo(
    () => ({ reservationId, expectedReference, revision }),
    [reservationId, expectedReference, revision],
  );

  const hasTarget = Boolean(
    request.reservationId || request.expectedReference,
  );

  useEffect(() => {
    if (!request.reservationId && !request.expectedReference) {
      return;
    }

    const controller = new AbortController();

    const pending = request.reservationId
      ? getMyBookingById(request.reservationId, controller.signal)
      : getAccountBooking(
          request.expectedReference,
          controller.signal,
        );

    pending.then(
      (booking) => {
        if (!controller.signal.aborted) {
          setResult({
            request,
            status: "ready",
            booking,
          });
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setResult({
            request,
            status:
              error.response?.status === 404
                ? "unavailable"
                : "error",
            booking: null,
          });
        }
      },
    );

    return () => controller.abort();
  }, [request]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  const state = !hasTarget
    ? { status: "unavailable", booking: null }
    : result?.request === request
      ? { status: result.status, booking: result.booking }
      : { status: "loading", booking: null };

  return {
    ...state,
    revision,
    refresh,
  };
}
