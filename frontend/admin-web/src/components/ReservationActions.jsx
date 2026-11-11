import StaffDataState from "./StaffDataState";
import { formatStatus } from "../utils/formatters";
import { titles } from "../constants/reservationActions.js";
import useReservationActions from "../hooks/useReservationActions.js";

export default function ReservationActions({
  reservationId,
  record,
  assignments,
  payment,
  onReload,
}) {
  const {
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
  } = useReservationActions({ reservationId, record, assignments, payment, onReload });

  if (record.status !== "ready") return null;

  return (
    <section
      className="content-card record-section reservation-actions"
      aria-labelledby="reservation-actions-title"
      onKeyDown={handleKeyDown}
    >
      <h2 id="reservation-actions-title" tabIndex={-1}>Reservation actions</h2>

      <p>Reservation rules are checked again before an action is applied.</p>

      {outcome.status !== "idle" && (
        <div className="feedback">
          <p
            ref={outcomeMessage}
            tabIndex={-1}
            role={["pending", "success"].includes(outcome.status) ? "status" : "alert"}
          >
            {outcome.message}
          </p>

          {["success", "error"].includes(outcome.status) && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleAcknowledgeReservationAction}
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
            <button type="button" onClick={reloadForReview} disabled={!ready}>
              Reload for review
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={!freshReview}
              onClick={acknowledgeReview}
            >
              I have reviewed the refreshed records
            </button>
          </div>
        </div>
      )}

      <StaffDataState state={rooms} label="Room catalog" />

      {rooms.status === "ready" && (
        <button
          type="button"
          className="secondary-button"
          disabled={pending || Boolean(confirmation)}
          onClick={rooms.reload}
        >
          Refresh room catalog
        </button>
      )}

      {ready && active.length > 1 && (
        <p role="alert">Multiple current assignments require staff review.</p>
      )}

      {!ready && (
        <p>
          Load the current assignment, payment, and room records before choosing an
          action.
        </p>
      )}

      {formError && (
        <p role="alert" className="feedback">
          {formError}
        </p>
      )}

      <div className="reservation-action-groups">
      {confirmed && (
        <fieldset disabled={disabled} className="action-fields">
          <legend>Physical room assignment</legend>

          <p>
            Room statuses are current catalog information. Stay-specific availability is
            checked when you confirm.
          </p>

          <label htmlFor="reservation-room">Room</label>

          <select
            id="reservation-room"
            value={selectedRoom?.id ?? ""}
            onChange={changeRoomId}
          >
            <option value="">Choose a room</option>

            {choices.map((room) => (
              <option key={room.id} value={room.id}>
                {room.roomNumber} — {formatStatus(room.status)}
              </option>
            ))}
          </select>

          {ready && choices.length === 0 && <p>No selectable rooms in this catalog.</p>}

          <div className="actions">
            <button type="button" disabled={!selectedRoom} onClick={reviewAssignment}>
              {current ? "Review reassignment" : "Review assignment"}
            </button>

            {current && (
              <button type="button" className="secondary-button" onClick={reviewRelease}>
                Review release
              </button>
            )}
          </div>
        </fieldset>
      )}

      {cancellableState && (
        <fieldset disabled={disabled} className="action-fields reservation-cancellation">
          <legend>Cancellation</legend>

          <p id="cancellation-policy-help">
            The reservation cannot be cancelled when any payment record exists, including
            failed or refunded records. Cancellation does not issue a refund.
          </p>

          <label htmlFor="cancellation-reason">Cancellation reason</label>

          <textarea
            id="cancellation-reason"
            value={reason}
            minLength={3}
            maxLength={500}
            rows={3}
            aria-describedby="cancellation-policy-help cancellation-reason-help"
            onChange={changeReason}
          />

          <p id="cancellation-reason-help">Enter 3–500 characters.</p>

          <button type="button" className="danger-button" onClick={reviewCancel}>
            Review cancellation
          </button>
        </fieldset>
      )}

      {confirmed && (
        <fieldset disabled={disabled} className="action-fields">
          <legend>Check-in</legend>

          <p>
            Check-in requires one current assignment, a ready room, full valid payment,
            and the property's identity check. Dates and all payment history are checked
            again before check-in.
          </p>

          <label className="action-checkbox" htmlFor="identity-verified">
            <input
              id="identity-verified"
              type="checkbox"
              checked={identityVerified}
              onChange={changeIdentityVerified}
            />
            I completed the property's guest identity check.
          </label>

          <button
            type="button"
            disabled={!canCheckIn || !identityVerified}
            onClick={reviewCheckIn}
          >
            Review check-in
          </button>
        </fieldset>
      )}

      {booking.status === "CHECKED_IN" && (
        <fieldset disabled={disabled} className="action-fields">
          <legend>Check-out</legend>

          <p>
            Settlement and access restrictions are checked before check-out. Successful
            check-out releases the assignment and marks the room Cleaning.
          </p>

          <button type="button" disabled={!canCheckOut} onClick={reviewCheckOut}>
            Review check-out
          </button>
        </fieldset>
      )}
      </div>

      {!["CONFIRMED", "PENDING", "CHECKED_IN"].includes(booking.status) && (
        <p>No actions are available for this reservation state.</p>
      )}

      {confirmation && (
        <section
          className="action-confirmation"
          aria-labelledby="action-confirmation-title"
        >
          <h3 id="action-confirmation-title" ref={confirmationHeading} tabIndex={-1}>
            {titles[confirmation.command.kind]}
          </h3>

          <p>
            Booking: <strong>{booking.reservationNumber}</strong>
          </p>

          {confirmation.roomLabel && (
            <p>
              Room: <strong>{confirmation.roomLabel}</strong>
            </p>
          )}

          {confirmation.command.kind === "cancel" && (
            <p>Reason: {confirmation.command.reason}</p>
          )}

          {confirmation.command.kind === "release" && (
            <p>The reservation will remain confirmed without this room assignment.</p>
          )}

          {!confirmationCurrent && (
            <p role="alert">
              Records changed. Return to the controls and review your choice again.
            </p>
          )}

          <div className="actions">
            <button
              type="button"
              className={confirmation.command.kind === "cancel" ? "danger-button" : undefined}
              disabled={!confirmationCurrent || pending || locked}
              onClick={confirmReservationAction}
            >
              Confirm {titles[confirmation.command.kind].toLowerCase()}
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
