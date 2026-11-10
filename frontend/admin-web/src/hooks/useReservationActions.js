import { acknowledgeReservationAction } from "../services/reservationsApi";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useStaffData } from "./useStaffData";
import { listRooms } from "../services/roomsApi";
import {
  getReservationActionState,
  performReservationAction,
  subscribeReservationActions,
} from "../services/reservationsApi";

export default function useReservationActions({
  reservationId,
  record,
  assignments,
  payment,
  onReload,
}) {
  const rooms = useStaffData(listRooms);

  const readOutcome = () => getReservationActionState(reservationId);

  const outcome = useSyncExternalStore(
    subscribeReservationActions,
    readOutcome,
    readOutcome,
  );

  const [roomId, setRoomId] = useState("");

  const [reason, setReason] = useState("");

  const [identityVerified, setIdentityVerified] = useState(false);

  const [confirmation, setConfirmation] = useState(null);

  const [baseline, setBaseline] = useState(null);

  const [formError, setFormError] = useState("");

  const submitting = useRef(false);

  const trigger = useRef(null);

  const confirmationHeading = useRef(null);

  const outcomeMessage = useRef(null);

  useEffect(() => {
    if (confirmation) {
      confirmationHeading.current?.focus();
    }
  }, [confirmation, record.status]);

  useEffect(() => {
    if (["success", "error", "conflict", "unknown"].includes(outcome.status)) {
      outcomeMessage.current?.focus();
    }
  }, [outcome, record.status]);

  if (record.status !== "ready")
    return {
      rooms,
      outcome,
      reason,
      identityVerified,
      confirmation,
      formError,
      confirmationHeading,
      outcomeMessage,
      handleKeyDown,
      handleAcknowledgeReservationAction,
      acknowledgeReview,
      changeRoomId,
      reviewAssignment,
      reviewRelease,
      changeReason,
      reviewCancel,
      changeIdentityVerified,
      reviewCheckIn,
      reviewCheckOut,
      confirmReservationAction,
    };

  const booking = record.data;

  const ready =
    assignments.status === "ready" &&
    payment.status === "ready" &&
    rooms.status === "ready";

  const active = assignments.data?.filter((item) => item.releasedAt === null) ?? [];

  const current = active.length === 1 ? active[0] : null;

  const currentRoom = rooms.data?.find((room) => room.id === current?.roomId);

  const pending = outcome.status === "pending";

  const locked = ["unknown", "conflict"].includes(outcome.status);

  const validContext = ready && active.length <= 1;

  const disabled = !validContext || pending || locked || Boolean(confirmation);

  const confirmed = booking.status === "CONFIRMED";

  const cancellableState = ["CONFIRMED", "PENDING"].includes(booking.status);

  const paid =
    payment.data?.status === "PAID" &&
    !payment.data.requiresReview &&
    payment.data.balanceDueCentavos === 0;

  const canCheckIn =
    confirmed &&
    current &&
    paid &&
    currentRoom?.isActive &&
    currentRoom.roomType.isActive &&
    currentRoom.status === "READY";

  const canCheckOut =
    booking.status === "CHECKED_IN" &&
    current &&
    paid &&
    currentRoom?.status === "OCCUPIED";

  const choices =
    rooms.data?.filter(
      (room) =>
        room.roomTypeId === booking.roomType.id &&
        room.isActive &&
        room.roomType.isActive &&
        room.roomType.capacity >= booking.guestCount &&
        !["MAINTENANCE", "OUT_OF_SERVICE"].includes(room.status) &&
        room.id !== current?.roomId,
    ) ?? [];

  const selectedRoom = choices.find((room) => room.id === roomId);

  const freshReview =
    baseline &&
    validContext &&
    record.data !== baseline.record &&
    assignments.data !== baseline.assignments &&
    payment.data !== baseline.payment &&
    rooms.data !== baseline.rooms;

  const confirmationCurrent =
    confirmation &&
    validContext &&
    confirmation.record === record.data &&
    confirmation.assignments === assignments.data &&
    confirmation.payment === payment.data &&
    confirmation.rooms === rooms.data;

  function review(kind, event) {
    if (disabled) return;

    setFormError("");

    if (["assign", "reassign"].includes(kind) && !selectedRoom) {
      setFormError("Choose a room from the current catalog.");
      return;
    }

    if (kind === "cancel" && (reason.trim().length < 3 || reason.trim().length > 500)) {
      setFormError("Enter a cancellation reason of 3–500 characters.");
      return;
    }

    if (kind === "check-in" && !identityVerified) {
      setFormError("Complete the guest identity check first.");
      return;
    }

    trigger.current = event.currentTarget;

    setConfirmation({
      command: {
        kind,
        reservationId,
        reservationNumber: booking.reservationNumber,
        assignmentId: current?.id,
        roomId: selectedRoom?.id,
        reason: reason.trim(),
        identityVerified,
      },
      roomLabel: ["assign", "reassign"].includes(kind)
        ? selectedRoom.roomNumber
        : currentRoom?.roomNumber,
      record: record.data,
      assignments: assignments.data,
      payment: payment.data,
      rooms: rooms.data,
    });
  }

  function back() {
    setConfirmation(null);

    window.requestAnimationFrame(() => {
      trigger.current?.focus();
    });
  }

  async function confirm() {
    if (!confirmationCurrent || pending || locked || submitting.current) {
      return;
    }

    submitting.current = true;

    try {
      await performReservationAction(confirmation.command);

      setConfirmation(null);
      setBaseline(null);

      onReload();
      rooms.reload();
    } catch {
      setConfirmation(null);
    } finally {
      submitting.current = false;
    }
  }

  function reloadForReview() {
    setBaseline({
      record: record.data,
      assignments: assignments.data,
      payment: payment.data,
      rooms: rooms.data,
    });

    setConfirmation(null);
    onReload();
    rooms.reload();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && confirmation && !pending) {
      event.stopPropagation();
      back();
    }
  }

  function handleAcknowledgeReservationAction() {
    return acknowledgeReservationAction(reservationId);
  }

  function acknowledgeReview() {
    acknowledgeReservationAction(reservationId);

    setBaseline(null);
    setFormError("");
  }

  function changeRoomId(event) {
    return setRoomId(event.target.value);
  }

  function reviewAssignment(event) {
    return review(current ? "reassign" : "assign", event);
  }

  function reviewRelease(event) {
    return review("release", event);
  }

  function changeReason(event) {
    return setReason(event.target.value);
  }

  function reviewCancel(event) {
    return review("cancel", event);
  }

  function changeIdentityVerified(event) {
    return setIdentityVerified(event.target.checked);
  }

  function reviewCheckIn(event) {
    return review("check-in", event);
  }

  function reviewCheckOut(event) {
    return review("check-out", event);
  }

  function confirmReservationAction() {
    return void confirm();
  }

  return {
    rooms,
    outcome,
    reason,
    identityVerified,
    confirmation,
    formError,
    confirmationHeading,
    outcomeMessage,
    booking,
    ready,
    active,
    current,
    pending,
    locked,
    disabled,
    confirmed,
    cancellableState,
    canCheckIn,
    canCheckOut,
    choices,
    selectedRoom,
    freshReview,
    confirmationCurrent,
    back,
    reloadForReview,
    handleKeyDown,
    handleAcknowledgeReservationAction,
    acknowledgeReview,
    changeRoomId,
    reviewAssignment,
    reviewRelease,
    changeReason,
    reviewCancel,
    changeIdentityVerified,
    reviewCheckIn,
    reviewCheckOut,
    confirmReservationAction,
  };
}
