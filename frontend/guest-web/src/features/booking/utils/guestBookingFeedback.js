const reservationMessages = {
  PENDING: {
    title: "Your booking request was received",
    message: "Your reservation is pending confirmation.",
  },
  CONFIRMED: {
    title: "Your reservation is confirmed",
    message: "The backend has confirmed your reservation. Reception completes check-in.",
  },
  CHECKED_IN: {
    title: "You are checked in",
    message: "Your stay is in progress. Contact reception for payment or departure questions.",
  },
  CHECKED_OUT: {
    title: "Your stay is complete",
    message: "Checkout is recorded. Payment history remains separate.",
  },
  CANCELLED: {
    title: "Your booking was cancelled",
    message: "This booking is closed. A payment or redirect cannot revive it.",
  },
  EXPIRED: {
    title: "Your booking request expired",
    message: "This request is closed. Check availability before requesting another stay.",
  },
};

export function guestBookingFeedback({
  booking,
  summary = null,
  paymentState = null,
  deadlineReached = false,
}) {
  const status = summary?.reservationStatus ?? booking.status;
  const online = booking.paymentPreference === "PAYMONGO";
  const closed = ["CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(status);
  const checkedIn = status === "CHECKED_IN";
  const requiresReview = Boolean(
    summary?.requiresReview || summary?.status === "REVIEW_REQUIRED" ||
    paymentState === "REVIEW_REQUIRED",
  );
  const paid = Boolean(
    summary?.status === "PAID" && !requiresReview &&
    (summary.balanceDueCentavos === 0 || (closed && summary.balanceDueCentavos === null)),
  );
  const canContinuePayment = Boolean(
    summary && online && ["PENDING", "CONFIRMED"].includes(status) &&
    !requiresReview && !paid && !deadlineReached &&
    Number.isSafeInteger(summary.balanceDueCentavos) && summary.balanceDueCentavos > 0,
  );
  const canStartAnother = !requiresReview && (!online || paid || closed || checkedIn);
  if (requiresReview) {
    return {
      title: "Booking or payment needs property review",
      message: "Contact the property before paying again. Review does not itself change the reservation status.",
      paid,
      closed,
      requiresReview,
      canContinuePayment: false,
      canStartAnother: false,
    };
  }
  const feedback = reservationMessages[status] ?? {
    title: "Check your booking details",
    message: "The current reservation state could not be identified. Contact the property.",
  };
  let message = feedback.message;
  if (status === "PENDING") {
    message = deadlineReached
      ? "The displayed deadline has passed. Check the latest backend records before continuing. This page does not itself expire the booking."
      : online
        ? "Your reservation is pending. Only verified payment within the applicable deadline can confirm an eligible request."
        : "Staff must contact you and record your agreement before confirming this reservation.";
  }
  message += summary
    ? paid
      ? " Full payment is recorded by the backend."
      : " Full payment has not been verified. Check payment records or contact the property before paying again."
    : " Payment records have not been checked.";
  return {
    title: feedback.title, message, paid, closed, requiresReview,
    canContinuePayment, canStartAnother,
  };
}
