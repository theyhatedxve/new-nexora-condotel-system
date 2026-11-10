import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  confirmGuestBooking,
  hasGuestBookingPolicyFields,
  isPropertyBookingRequest,
  recordGuestContact,
  rejectGuestBooking,
} from "../services/guestBookingStaffApi";
import { staffRoles } from "../constants/guestBookingStaffPanel.js";
import { failureMessage } from "../utils/guestBookingStaffPanelHelpers.js";

export default function useGuestBookingStaffPanel({ record, payment, onReload }) {
  const { status: authStatus, user } = useAuth();

  const prefix = useId();

  const [channel, setChannel] = useState("");

  const [guestAgreed, setGuestAgreed] = useState(false);

  const [reason, setReason] = useState("");

  const [review, setReview] = useState(null);

  const [busy, setBusy] = useState(false);

  const [formError, setFormError] = useState("");

  const [outcome, setOutcome] = useState(null);

  const [now, setNow] = useState(() => Date.now());

  const submitting = useRef(false);

  const trigger = useRef(null);

  const reviewHeading = useRef(null);

  const message = useRef(null);

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);

  useEffect(() => {
    if (outcome && record.status === "ready") {
      message.current?.focus();
    }
  }, [outcome, record.status]);

  if (
    authStatus !== "authenticated" ||
    !staffRoles.includes(user?.role) ||
    record.status !== "ready"
  ) {
    return {
      authStatus,
      user,
      prefix,
      channel,
      guestAgreed,
      reason,
      review,
      busy,
      formError,
      outcome,
      reviewHeading,
      message,
      changeChannel,
      reviewContact,
      changeGuestAgreed,
      reviewConfirm,
      changeReason,
      reviewReject,
    };
  }

  const booking = record.data;

  if (!hasGuestBookingPolicyFields(booking)) {
    return {
      authStatus,
      user,
      prefix,
      channel,
      guestAgreed,
      reason,
      review,
      busy,
      formError,
      outcome,
      reviewHeading,
      message,
      booking,
      changeChannel,
      reviewContact,
      changeGuestAgreed,
      reviewConfirm,
      changeReason,
      reviewReject,
    };
  }

  if (!isPropertyBookingRequest(booking))
    return {
      authStatus,
      user,
      prefix,
      channel,
      guestAgreed,
      reason,
      review,
      busy,
      formError,
      outcome,
      reviewHeading,
      message,
      booking,
      changeChannel,
      reviewContact,
      changeGuestAgreed,
      reviewConfirm,
      changeReason,
      reviewReject,
    };

  const summary = payment.data;

  const financialStateReady =
    payment.status === "ready" &&
    summary?.reservationNumber === booking.reservationNumber &&
    summary.reservationStatus === booking.status &&
    summary.status === "UNPAID" &&
    summary.requiresReview === false &&
    summary.hasPendingPayment === false &&
    summary.collectedCentavos === 0 &&
    summary.refundedCentavos === 0;

  const deadline = Date.parse(booking.holdExpiresAt);

  const timingReady =
    Number.isFinite(Date.parse(booking.expectedArrivalAt)) && Number.isFinite(deadline);

  const overdue = timingReady && deadline <= now;

  const pending = booking.status === "PENDING";

  const awaitingRefresh = outcome?.baseline === booking;

  const canAct =
    pending &&
    timingReady &&
    !overdue &&
    financialStateReady &&
    !busy &&
    !awaitingRefresh;

  const canConfirm =
    canAct && Boolean(booking.firstContactedAt) && Boolean(booking.responseDeadlineAt);

  const reviewChanged = review && review.baseline !== booking;

  function beginReview(kind, event) {
    setFormError("");
    if (!canAct) return;

    if (kind === "contact" && !channel) {
      setFormError("Choose phone or email contact.");
      return;
    }
    if (kind === "confirm" && (!canConfirm || !guestAgreed)) {
      setFormError("Record contact and explicitly acknowledge the guest’s agreement.");
      return;
    }
    const cleanedReason = reason.trim();
    if (kind === "reject" && (cleanedReason.length < 3 || cleanedReason.length > 500)) {
      setFormError("Enter a rejection reason of 3–500 characters.");
      return;
    }

    trigger.current = event.currentTarget;
    setReview({
      kind,
      baseline: booking,
      channel,
      guestAgreed,
      reason: cleanedReason,
    });
  }

  function backToForm() {
    setReview(null);
    trigger.current?.focus();
  }

  async function submitReview() {
    if (
      submitting.current ||
      !review ||
      reviewChanged ||
      !canAct ||
      (review.kind === "confirm" && !canConfirm)
    ) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setFormError("");
    const command = review;
    let result;

    try {
      if (command.kind === "contact") {
        await recordGuestContact(booking, command.channel);
        result = {
          success: true,
          text: "Guest contact recorded. Check the refreshed deadlines.",
        };
      } else if (command.kind === "confirm") {
        await confirmGuestBooking(booking, command.guestAgreed);
        result = {
          success: true,
          text: "Guest agreement recorded and reservation confirmed. No payment was recorded.",
        };
      } else {
        await rejectGuestBooking(booking, command.reason);
        result = {
          success: true,
          text: "Booking request rejected. Check the refreshed reservation status.",
        };
      }
    } catch (error) {
      result = { success: false, text: failureMessage(error) };
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }

    if (!mounted.current) return;
    setOutcome({ ...result, baseline: booking });
    setReview(null);
    setGuestAgreed(false);
    setReason("");
    setChannel("");
    onReload();
  }

  function changeChannel(event) {
    return setChannel(event.target.value);
  }

  function reviewContact(event) {
    return beginReview("contact", event);
  }

  function changeGuestAgreed(event) {
    return setGuestAgreed(event.target.checked);
  }

  function reviewConfirm(event) {
    return beginReview("confirm", event);
  }

  function changeReason(event) {
    return setReason(event.target.value);
  }

  function reviewReject(event) {
    return beginReview("reject", event);
  }

  return {
    authStatus,
    user,
    prefix,
    channel,
    guestAgreed,
    reason,
    review,
    busy,
    formError,
    outcome,
    reviewHeading,
    message,
    booking,
    financialStateReady,
    timingReady,
    overdue,
    pending,
    canAct,
    canConfirm,
    reviewChanged,
    backToForm,
    submitReview,
    changeChannel,
    reviewContact,
    changeGuestAgreed,
    reviewConfirm,
    changeReason,
    reviewReject,
  };
}
