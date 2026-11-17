import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { guestBookingFeedback } from "../utils/guestBookingFeedback.js";

export default function useGuestBookingReceipt({ flow }) {
  const navigate = useNavigate();

  const heading = useRef(null);

  const [now, setNow] = useState(() => Date.now());

  const { receipt, attempt, payment, summary, busy, error } = flow;

  useEffect(() => {
    heading.current?.focus();
  }, [receipt.requestId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const online = receipt.paymentPreference === "PAYMONGO";

  const status = summary?.reservationStatus ?? receipt.status;
  const deadlineReached = Boolean(
    status === "PENDING" &&
    receipt.holdExpiresAt &&
    now >= Date.parse(receipt.holdExpiresAt),
  );
  const feedback = guestBookingFeedback({
    booking: receipt, summary, paymentState: payment?.state, deadlineReached,
  });

  function startAnother() {
    if (!busy && feedback.canStartAnother && flow.finishKnownBooking()) {
      navigate("/rooms");
    }
  }

  return {
    heading,
    receipt,
    attempt,
    payment,
    summary,
    busy,
    error,
    online,
    deadlineReached,
    ...feedback,
    startAnother,
  };
}
