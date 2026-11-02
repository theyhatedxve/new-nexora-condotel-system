import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useStaffData } from "../hooks/useStaffData";
import { listRooms } from "../services/roomsApi";

import {
  acknowledgeReservationAction,
  getReservationActionState,
  performReservationAction,
  subscribeReservationActions,
} from "../services/reservationsApi";

import StaffDataState from "./StaffDataState";
import { formatStatus } from "../utils/formatters";

const titles = {
  assign: "Assign room",
  reassign: "Reassign room",
  release: "Release assignment",
  cancel: "Cancel reservation",
  "check-in": "Check in guest",
  "check-out": "Check out guest",
};

export default function ReservationActions({
  reservationId,
  record,
  assignments,
  payment,
  onReload,
}) {
  const rooms = useStaffData(listRooms);

  const readOutcome = () =>
    getReservationActionState(reservationId);

  const outcome = useSyncExternalStore(
    subscribeReservationActions,
    readOutcome,
    readOutcome,
  );

  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");

  const [
    identityVerified,
    setIdentityVerified,
  ] = useState(false);

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
    if (
      ["success", "error", "conflict", "unknown"]
        .includes(outcome.status)
    ) {
      outcomeMessage.current?.focus();
    }
  }, [outcome, record.status]);

  if (record.status !== "ready") return null;

  const booking = record.data;

  const ready =
    assignments.status === "ready" &&
    payment.status === "ready" &&
    rooms.status === "ready";

  const active =
    assignments.data?.filter(
      (item) => item.releasedAt === null,
    ) ?? [];

  const current =
    active.length === 1 ? active[0] : null;

  const currentRoom = rooms.data?.find(
    (room) => room.id === current?.roomId,
  );

  const pending = outcome.status === "pending";

  const locked = [
    "unknown",
    "conflict",
  ].includes(outcome.status);

  const validContext =
    ready && active.length <= 1;

  const disabled =
    !validContext ||
    pending ||
    locked ||
    Boolean(confirmation);

  const confirmed =
    booking.status === "CONFIRMED";

  const cancellableState = [
    "CONFIRMED",
    "PENDING",
  ].includes(booking.status);

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
        ![
          "MAINTENANCE",
          "OUT_OF_SERVICE",
        ].includes(room.status) &&
        room.id !== current?.roomId,
    ) ?? [];

  const selectedRoom = choices.find(
    (room) => room.id === roomId,
  );

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

    if (
      ["assign", "reassign"].includes(kind) &&
      !selectedRoom
    ) {
      setFormError(
        "Choose a room from the current catalog.",
      );
      return;
    }

    if (
      kind === "cancel" &&
      (
        reason.trim().length < 3 ||
        reason.trim().length > 500
      )
    ) {
      setFormError(
        "Enter a cancellation reason of 3–500 characters.",
      );
      return;
    }

    if (
      kind === "check-in" &&
      !identityVerified
    ) {
      setFormError(
        "Complete the guest identity check first.",
      );
      return;
    }

    trigger.current = event.currentTarget;

    setConfirmation({
      command: {
        kind,
        reservationId,
        reservationNumber:
          booking.reservationNumber,
        assignmentId: current?.id,
        roomId: selectedRoom?.id,
        reason: reason.trim(),
        identityVerified,
      },
      roomLabel: [
        "assign",
        "reassign",
      ].includes(kind)
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
    if (
      !confirmationCurrent ||
      pending ||
      locked ||
      submitting.current
    ) {
      return;
    }

    submitting.current = true;

    try {
      await performReservationAction(
        confirmation.command,
      );

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

  return (
    <section
      className="content-card record-section reservation-actions"
      aria-labelledby="reservation-actions-title"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          confirmation &&
          !pending
        ) {
          event.stopPropagation();
          back();
        }
      }}
    >
      <h2 id="reservation-actions-title">
        Reservation actions
      </h2>

      <p>
        Reservation rules are checked again before
        an action is applied.
      </p>

      {outcome.status !== "idle" && (
        <div className="feedback">
          <p
            ref={outcomeMessage}
            tabIndex={-1}
            role={
              ["pending", "success"].includes(
                outcome.status,
              )
                ? "status"
                : "alert"
            }
          >
            {outcome.message}
          </p>

          {["success", "error"].includes(
            outcome.status,
          ) && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                acknowledgeReservationAction(
                  reservationId,
                )
              }
            >
              Dismiss message
            </button>
          )}
        </div>
      )}

      {locked && (
        <div className="action-review">
          <p>
            {outcome.status === "unknown"
              ? "The operation may have completed. Reload and inspect the booking, assignments, and payment summary."
              : "The operation was rejected. Reload and review the latest records before choosing another action."}
          </p>

          <div className="actions">
            <button
              type="button"
              onClick={reloadForReview}
              disabled={!ready}
            >
              Reload for review
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={!freshReview}
              onClick={() => {
                acknowledgeReservationAction(
                  reservationId,
                );

                setBaseline(null);
                setFormError("");
              }}
            >
              I have reviewed the refreshed records
            </button>
          </div>
        </div>
      )}

      <StaffDataState
        state={rooms}
        label="Room catalog"
      />

      {rooms.status === "ready" && (
        <button
          type="button"
          className="secondary-button"
          disabled={
            pending || Boolean(confirmation)
          }
          onClick={rooms.reload}
        >
          Refresh room catalog
        </button>
      )}

      {ready && active.length > 1 && (
        <p role="alert">
          Multiple current assignments require
          staff review.
        </p>
      )}

      {!ready && (
        <p>
          Load the current assignment, payment,
          and room records before choosing an action.
        </p>
      )}

      {formError && (
        <p role="alert" className="feedback">
          {formError}
        </p>
      )}

      {confirmed && (
        <fieldset
          disabled={disabled}
          className="action-fields"
        >
          <legend>
            Physical room assignment
          </legend>

          <p>
            Room statuses are current catalog information.
            Stay-specific availability is checked when
            you confirm.
          </p>

          <label htmlFor="reservation-room">
            Room
          </label>

          <select
            id="reservation-room"
            value={selectedRoom?.id ?? ""}
            onChange={(event) =>
              setRoomId(event.target.value)
            }
          >
            <option value="">
              Choose a room
            </option>

            {choices.map((room) => (
              <option
                key={room.id}
                value={room.id}
              >
                {room.roomNumber} —{" "}
                {formatStatus(room.status)}
              </option>
            ))}
          </select>

          {ready && choices.length === 0 && (
            <p>
              No selectable rooms in this catalog.
            </p>
          )}

          <div className="actions">
            <button
              type="button"
              disabled={!selectedRoom}
              onClick={(event) =>
                review(
                  current ? "reassign" : "assign",
                  event,
                )
              }
            >
              {current
                ? "Review reassignment"
                : "Review assignment"}
            </button>

            {current && (
              <button
                type="button"
                className="secondary-button"
                onClick={(event) =>
                  review("release", event)
                }
              >
                Review release
              </button>
            )}
          </div>
        </fieldset>
      )}

      {cancellableState && (
        <fieldset
          disabled={disabled}
          className="action-fields"
        >
          <legend>Cancellation</legend>

          <p>
            The reservation cannot be cancelled when
            any payment record exists, including
            failed or refunded records.
          </p>

          <label htmlFor="cancellation-reason">
            Cancellation reason
          </label>

          <textarea
            id="cancellation-reason"
            value={reason}
            minLength={3}
            maxLength={500}
            rows={3}
            aria-describedby="cancellation-reason-help"
            onChange={(event) =>
              setReason(event.target.value)
            }
          />

          <p id="cancellation-reason-help">
            Enter 3–500 characters.
          </p>

          <button
            type="button"
            className="danger-button"
            onClick={(event) =>
              review("cancel", event)
            }
          >
            Review cancellation
          </button>
        </fieldset>
      )}

      {confirmed && (
        <fieldset
          disabled={disabled}
          className="action-fields"
        >
          <legend>Check-in</legend>

          <p>
            Check-in requires one current assignment,
            a ready room, full valid payment, and the
            property's identity check. Dates and all
            payment history are checked again before
            check-in.
          </p>

          <label
            className="action-checkbox"
            htmlFor="identity-verified"
          >
            <input
              id="identity-verified"
              type="checkbox"
              checked={identityVerified}
              onChange={(event) =>
                setIdentityVerified(
                  event.target.checked,
                )
              }
            />

            I completed the property's guest
            identity check.
          </label>

          <button
            type="button"
            disabled={
              !canCheckIn || !identityVerified
            }
            onClick={(event) =>
              review("check-in", event)
            }
          >
            Review check-in
          </button>
        </fieldset>
      )}

      {booking.status === "CHECKED_IN" && (
        <fieldset
          disabled={disabled}
          className="action-fields"
        >
          <legend>Check-out</legend>

          <p>
            Settlement and access restrictions are checked
            before check-out. Successful check-out releases
            the assignment and marks the room Cleaning.
          </p>

          <button
            type="button"
            disabled={!canCheckOut}
            onClick={(event) =>
              review("check-out", event)
            }
          >
            Review check-out
          </button>
        </fieldset>
      )}

      {![
        "CONFIRMED",
        "PENDING",
        "CHECKED_IN",
      ].includes(booking.status) && (
        <p>
          No actions are available for this reservation state.
        </p>
      )}

      {confirmation && (
        <section
          className="action-confirmation"
          aria-labelledby="action-confirmation-title"
        >
          <h3
            id="action-confirmation-title"
            ref={confirmationHeading}
            tabIndex={-1}
          >
            {titles[confirmation.command.kind]}
          </h3>

          <p>
            Booking:{" "}
            <strong>
              {booking.reservationNumber}
            </strong>
          </p>

          {confirmation.roomLabel && (
            <p>
              Room:{" "}
              <strong>
                {confirmation.roomLabel}
              </strong>
            </p>
          )}

          {confirmation.command.kind === "cancel" && (
            <p>
              Reason: {confirmation.command.reason}
            </p>
          )}

          {confirmation.command.kind === "release" && (
            <p>
              The reservation will remain confirmed
              without this room assignment.
            </p>
          )}

          {!confirmationCurrent && (
            <p role="alert">
              Records changed. Return to the controls
              and review your choice again.
            </p>
          )}

          <div className="actions">
            <button
              type="button"
              disabled={
                !confirmationCurrent ||
                pending ||
                locked
              }
              onClick={() => void confirm()}
            >
              Confirm{" "}
              {titles[
                confirmation.command.kind
              ].toLowerCase()}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={pending}
              onClick={back}
            >
              Back to controls
            </button>
          </div>
        </section>
      )}
    </section>
  );
}