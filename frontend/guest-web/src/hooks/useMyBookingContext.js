import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { bookingReferenceFromSearch } from "../utils/bookingContext.js";

const RESERVATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default function useMyBookingContext() {
  const { reservationId } = useParams();
  const [params] = useSearchParams();

  const search = params.toString();

  const context = useMemo(() => {
    if (reservationId !== undefined) {
      if (!RESERVATION_ID_PATTERN.test(reservationId)) {
        return {
          reservationId: null,
          reference: null,
          error: "The booking context is invalid.",
        };
      }

      return {
        reservationId,
        reference: null,
        error: "",
      };
    }

    try {
      return {
        reservationId: null,
        reference: bookingReferenceFromSearch(search),
        error: "",
      };
    } catch {
      return {
        reservationId: null,
        reference: null,
        error: "The booking context is invalid.",
      };
    }
  }, [reservationId, search]);

  return { context };
}
