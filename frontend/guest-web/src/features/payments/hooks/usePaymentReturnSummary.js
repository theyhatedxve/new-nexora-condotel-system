import { useEffect, useState } from "react";
import { getGuestBookingPaymentSummary } from "../../checkout/services/guestBookingApi.js";
import { guestBookingFeedback } from "../../booking/utils/guestBookingFeedback.js";

export default function usePaymentReturnSummary({ booking }) {
  const [state, setState] = useState({
    status: "loading",
    summary: null,
    checkedAt: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getGuestBookingPaymentSummary(booking.reservationNumber, controller.signal)
      .then((summary) => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            summary,
            checkedAt: Date.now(),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            summary: null,
            checkedAt: null,
          });
        }
      });

    return () => controller.abort();
  }, [booking.reservationNumber]);

  const summary = state.summary;

  const deadlineReached = Boolean(
    summary?.reservationStatus === "PENDING" &&
    booking.holdExpiresAt &&
    state.checkedAt !== null &&
    Date.parse(booking.holdExpiresAt) <= state.checkedAt,
  );
  const feedback = guestBookingFeedback({ booking, summary, deadlineReached });

  const title =
    state.status === "loading"
      ? "Checking payment"
      : state.status === "error"
        ? "Payment status unavailable"
        : feedback.title;

  return { state, summary, message: feedback.message, title };
}
