import { useState } from "react";
import { useStaffData } from "./useStaffData";
import { useRoomChange } from "./useRoomChange";
import { listStaffRoomTypes } from "../services/roomTypesApi";

export default function useCreateRoomForm({ rooms }) {
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

  const activeTypes = types.data?.filter((type) => type.isActive) ?? [];

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      const selected = activeTypes.find((type) => type.id === roomTypeId);

      if (!selected) {
        throw new Error("Choose an active room type.");
      }

      if (rooms.data.some((room) => room.roomNumber === roomNumber.trim())) {
        throw new Error("That room number is already listed. Review the existing room.");
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

  const showCatalogReview =
    change.sameScope && ["result", "review"].includes(change.state.status);

  const catalogMatch =
    rooms.status === "ready"
      ? rooms.data.find((room) => room.roomNumber === roomNumber.trim())
      : null;

  function changeRoomNumber(event) {
    return setRoomNumber(event.target.value);
  }

  function changeFloor(event) {
    return setFloor(event.target.value);
  }

  function changeRoomTypeId(event) {
    return setRoomTypeId(event.target.value);
  }

  return {
    types,
    roomNumber,
    floor,
    roomTypeId,
    error,
    change,
    activeTypes,
    prepare,
    showCatalogReview,
    catalogMatch,
    changeRoomNumber,
    changeFloor,
    changeRoomTypeId,
  };
}
