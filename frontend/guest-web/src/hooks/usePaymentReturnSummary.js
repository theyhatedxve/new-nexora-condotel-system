import { useEffect, useState } from "react";
import { getGuestBookingPaymentSummary } from "../services/guestBookingApi.js";

export default function usePaymentReturnSummary({ booking }) {
  const [state, setState] = useState({
    status: "loading",
    summary: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getGuestBookingPaymentSummary(booking.reservationNumber, controller.signal)
      .then((summary) => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            summary,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            summary: null,
          });
        }
      });

    return () => controller.abort();
  }, [booking.reservationNumber]);

  const summary = state.summary;

  const paid = summary?.status === "PAID" && !summary.requiresReview;

  const closed =
    summary &&
    ["CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(summary.reservationStatus);

  const title =
    state.status === "loading"
      ? "Checking payment"
      : state.status === "error"
        ? "Payment status unavailable"
        : summary.requiresReview
          ? "Payment needs review"
          : paid
            ? "Full payment recorded"
            : closed
              ? "Booking is closed"
              : "Payment verification pending";

  return { state, summary, paid, closed, title };
}
