import { useState } from "react";

import { useStaffData } from "../hooks/useStaffData";
import { useRoomChange } from "../hooks/useRoomChange";
import { listStaffRoomTypes } from "../services/roomTypesApi";

import StaffDataState from "./StaffDataState";
import RoomChangeReview from "./RoomChangeReview";

export default function CreateRoomForm({ rooms }) {
  const types = useStaffData(listStaffRoomTypes);

  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [error, setError] = useState("");

  const change = useRoomChange({
    scope: "/rooms",
    sources: [rooms, types],
    onReload: () => {
      rooms.reload();
      types.reload();
    },
  });

  const activeTypes =
    types.data?.filter((type) => type.isActive) ?? [];

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      const selected = activeTypes.find(
        (type) => type.id === roomTypeId,
      );

      if (!selected) {
        throw new Error("Choose an active room type.");
      }

      if (
        rooms.data.some(
          (room) => room.roomNumber === roomNumber.trim(),
        )
      ) {
        throw new Error(
          "That room number is already listed. Review the existing room.",
        );
      }

      change.prepare(
        {
          kind: "create-room",
          roomNumber,
          floor,
          roomTypeId,
        },
        "Create room",
        [
          "Room: " + roomNumber.trim(),
          "Floor: " + (floor.trim() || "Not recorded"),
          "Room type: " + selected.name,
          "Initial status: Ready and active",
        ],
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <section
      className="record-section room-management"
      aria-labelledby="create-room-title"
    >
      <h2 id="create-room-title">Create room</h2>

      <StaffDataState
        state={types}
        label="Room types"
      />

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={change.disabled}
        >
          <legend>New physical room</legend>

          <label htmlFor="new-room-number">
            Room number
          </label>
          <input
            id="new-room-number"
            required
            maxLength={30}
            value={roomNumber}
            onChange={(event) =>
              setRoomNumber(event.target.value)
            }
          />

          <label htmlFor="new-room-floor">
            Floor
          </label>
          <input
            id="new-room-floor"
            maxLength={30}
            value={floor}
            onChange={(event) =>
              setFloor(event.target.value)
            }
          />

          <label htmlFor="new-room-type">
            Room type
          </label>
          <select
            id="new-room-type"
            required
            value={roomTypeId}
            onChange={(event) =>
              setRoomTypeId(event.target.value)
            }
          >
            <option value="">Choose a room type</option>

            {activeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} — capacity {type.capacity}
              </option>
            ))}
          </select>

          <button type="submit">
            Review new room
          </button>
        </fieldset>
      </form>

      {types.status === "ready" && activeTypes.length === 0 && (
        <p role="status">
          No active room types are available for creation.
        </p>
      )}

      <RoomChangeReview change={change} />
    </section>
  );
}