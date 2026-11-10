import StaffDataState from "./StaffDataState";
import RoomBlockManagement from "./RoomBlockManagement";
import RoomChangeReview from "./RoomChangeReview";
import { formatStatus } from "../utils/formatters";
import { manualStatuses } from "../constants/roomManagement.js";
import useRoomManagement from "../hooks/useRoomManagement.js";

export default function RoomManagement({ room, blocks }) {
  const {
    types,
    draft,
    nextStatus,
    error,
    change,
    loadRoomValues,
    prepareEdit,
    prepareStatus,
    currentRoom,
    changeRoomNumber,
    changeFloor,
    changeRoomTypeId,
    changeIsActive,
    changeNextStatus,
  } = useRoomManagement({ room, blocks });

  return (
    <section
      className="record-section room-management"
      aria-labelledby="room-management-title"
    >
      <h2 id="room-management-title">Room management</h2>

      <StaffDataState state={types} label="Management room types" />

      {error && <p role="alert">{error}</p>}

      <button type="button" disabled={change.disabled} onClick={loadRoomValues}>
        Load current room values
      </button>

      {draft && (
        <form onSubmit={prepareEdit}>
          <fieldset className="action-fields" disabled={change.disabled}>
            <legend>Edit room</legend>

            <label htmlFor="edit-room-number">Room number</label>
            <input
              id="edit-room-number"
              required
              maxLength={30}
              value={draft.roomNumber}
              onChange={changeRoomNumber}
            />

            <label htmlFor="edit-room-floor">Floor</label>
            <input
              id="edit-room-floor"
              maxLength={30}
              value={draft.floor}
              onChange={changeFloor}
            />

            <label htmlFor="edit-room-type">Room type</label>
            <select
              id="edit-room-type"
              required
              value={draft.roomTypeId}
              onChange={changeRoomTypeId}
            >
              {(types.data ?? []).map((type) => (
                <option
                  key={type.id}
                  value={type.id}
                  disabled={!type.isActive && type.id !== currentRoom?.roomTypeId}
                >
                  {type.name}
                  {type.isActive ? "" : " — inactive"}
                </option>
              ))}
            </select>

            <label htmlFor="edit-room-active">Room active</label>
            <select
              id="edit-room-active"
              value={draft.isActive ? "yes" : "no"}
              onChange={changeIsActive}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <button type="submit">Review room edit</button>
          </fieldset>
        </form>
      )}

      {currentRoom && (
        <>
          <form onSubmit={prepareStatus}>
            <fieldset
              className="action-fields"
              disabled={change.disabled || currentRoom.status === "OCCUPIED"}
            >
              <legend>Change operational status</legend>

              <p>Current status: {formatStatus(currentRoom.status)}</p>

              <label htmlFor="next-room-status">New status</label>
              <select
                id="next-room-status"
                required
                value={nextStatus}
                onChange={changeNextStatus}
              >
                <option value="">Choose a status</option>

                {manualStatuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={
                      status === currentRoom.status ||
                      (!currentRoom.isActive && ["READY", "CLEANING"].includes(status))
                    }
                  >
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <button type="submit">Review status change</button>
            </fieldset>
          </form>

          {currentRoom.status === "OCCUPIED" && (
            <p>
              Occupied status is controlled by the guest check-in and check-out workflow.
            </p>
          )}

          <RoomBlockManagement room={currentRoom} blocks={blocks} change={change} />
        </>
      )}

      <RoomChangeReview change={change} />
    </section>
  );
}
