import { useState } from "react";

import { useStaffData } from "../hooks/useStaffData";
import { useRoomChange } from "../hooks/useRoomChange";
import { listStaffRoomTypes } from "../services/roomTypesApi";

import StaffDataState from "./StaffDataState";
import RoomBlockManagement from "./RoomBlockManagement";
import RoomChangeReview from "./RoomChangeReview";

import { formatStatus } from "../utils/formatters";

const manualStatuses = [
  "READY",
  "CLEANING",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
];

export default function RoomManagement({
  room,
  blocks,
}) {
  const types = useStaffData(listStaffRoomTypes);

  const [draft, setDraft] = useState(null);
  const [roomVersion, setRoomVersion] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [error, setError] = useState("");

  const change = useRoomChange({
    scope: "/rooms/" + encodeURIComponent(room.data?.id ?? ""),
    sources: [room, blocks, types],
    onReload: () => {
      room.reload();
      blocks.reload();
      types.reload();
    },
  });

  function loadRoomValues() {
    if (room.status !== "ready") return;

    setDraft({
      roomNumber: room.data.roomNumber,
      floor: room.data.floor ?? "",
      roomTypeId: room.data.roomTypeId,
      isActive: room.data.isActive,
    });

    setRoomVersion(JSON.stringify(room.data));
    setError("");
  }

  function edit(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function prepareEdit(event) {
    event.preventDefault();
    setError("");

    try {
      if (
        !draft ||
        room.status !== "ready" ||
        JSON.stringify(room.data) !== roomVersion
      ) {
        throw new Error(
          "The room changed. Load its current values before reviewing this edit.",
        );
      }

      const changingType =
        draft.roomTypeId !== room.data.roomTypeId;

      const selectedType = types.data.find(
        (type) => type.id === draft.roomTypeId,
      );

      if (
        !selectedType ||
        (changingType && !selectedType.isActive)
      ) {
        throw new Error(
          "Choose an active room type when changing the type.",
        );
      }

      change.prepare(
        {
          kind: "edit-room",
          roomId: room.data.id,
          roomNumber: draft.roomNumber,
          floor: draft.floor,
          isActive: draft.isActive,
          roomTypeId: changingType
            ? draft.roomTypeId
            : undefined,
        },
        "Edit room",
        [
          "Current room: " + room.data.roomNumber,
          "New room number: " + draft.roomNumber.trim(),
          "Floor: " + (draft.floor.trim() || "Not recorded"),
          "Room type: " + selectedType.name,
          "Active: " + (draft.isActive ? "Yes" : "No"),
        ],
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function prepareStatus(event) {
    event.preventDefault();
    setError("");

    try {
      if (
        room.status !== "ready" ||
        room.data.status === "OCCUPIED" ||
        nextStatus === room.data.status
      ) {
        throw new Error(
          "Choose a different permitted status for an unoccupied room.",
        );
      }

      change.prepare(
        {
          kind: "room-status",
          roomId: room.data.id,
          status: nextStatus,
        },
        "Change room status",
        [
          "Room: " + room.data.roomNumber,
          "Current status: " + formatStatus(room.data.status),
          "Requested status: " + formatStatus(nextStatus),
        ],
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  const currentRoom =
    room.status === "ready" ? room.data : null;

  return (
    <section
      className="record-section room-management"
      aria-labelledby="room-management-title"
    >
      <h2 id="room-management-title">Room management</h2>

      <StaffDataState
        state={types}
        label="Management room types"
      />

      {error && <p role="alert">{error}</p>}

      <button
        type="button"
        disabled={change.disabled}
        onClick={loadRoomValues}
      >
        Load current room values
      </button>

      {draft && (
        <form onSubmit={prepareEdit}>
          <fieldset
            className="action-fields"
            disabled={change.disabled}
          >
            <legend>Edit room</legend>

            <label htmlFor="edit-room-number">
              Room number
            </label>
            <input
              id="edit-room-number"
              required
              maxLength={30}
              value={draft.roomNumber}
              onChange={(event) =>
                edit("roomNumber", event.target.value)
              }
            />

            <label htmlFor="edit-room-floor">Floor</label>
            <input
              id="edit-room-floor"
              maxLength={30}
              value={draft.floor}
              onChange={(event) =>
                edit("floor", event.target.value)
              }
            />

            <label htmlFor="edit-room-type">
              Room type
            </label>
            <select
              id="edit-room-type"
              required
              value={draft.roomTypeId}
              onChange={(event) =>
                edit("roomTypeId", event.target.value)
              }
            >
              {(types.data ?? []).map((type) => (
                <option
                  key={type.id}
                  value={type.id}
                  disabled={
                    !type.isActive &&
                    type.id !== currentRoom?.roomTypeId
                  }
                >
                  {type.name}
                  {type.isActive ? "" : " — inactive"}
                </option>
              ))}
            </select>

            <label htmlFor="edit-room-active">
              Room active
            </label>
            <select
              id="edit-room-active"
              value={draft.isActive ? "yes" : "no"}
              onChange={(event) =>
                edit("isActive", event.target.value === "yes")
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <button type="submit">
              Review room edit
            </button>
          </fieldset>
        </form>
      )}

      {currentRoom && (
        <>
          <form onSubmit={prepareStatus}>
            <fieldset
              className="action-fields"
              disabled={
                change.disabled ||
                currentRoom.status === "OCCUPIED"
              }
            >
              <legend>Change operational status</legend>

              <p>
                Current status:{" "}
                {formatStatus(currentRoom.status)}
              </p>

              <label htmlFor="next-room-status">
                New status
              </label>
              <select
                id="next-room-status"
                required
                value={nextStatus}
                onChange={(event) =>
                  setNextStatus(event.target.value)
                }
              >
                <option value="">Choose a status</option>

                {manualStatuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={
                      status === currentRoom.status ||
                      (
                        !currentRoom.isActive &&
                        ["READY", "CLEANING"].includes(status)
                      )
                    }
                  >
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <button type="submit">
                Review status change
              </button>
            </fieldset>
          </form>

          {currentRoom.status === "OCCUPIED" && (
            <p>
              Occupied status is controlled by the guest
              check-in and check-out workflow.
            </p>
          )}

          <RoomBlockManagement
            room={currentRoom}
            blocks={blocks}
            change={change}
          />
        </>
      )}

      <RoomChangeReview change={change} />
    </section>
  );
}