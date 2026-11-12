import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

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

  const closed = ["CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(receipt.status);

  const paid =
    summary?.status === "PAID" &&
    !summary.requiresReview &&
    summary.balanceDueCentavos === 0 &&
    receipt.status === "CONFIRMED";

  const deadlineReached =
    receipt.status === "PENDING" &&
    receipt.holdExpiresAt &&
    now >= Date.parse(receipt.holdExpiresAt);

  const title = closed
    ? "Booking request closed"
    : receipt.status === "CONFIRMED"
      ? "Your reservation is confirmed"
      : online
        ? "Complete your test payment"
        : "Your booking request was received";

  const canStartAnother = !online || paid || closed;

  function startAnother() {
    if (flow.finishKnownBooking()) {
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
    closed,
    paid,
    deadlineReached,
    title,
    canStartAnother,
    startAnother,
  };
}
