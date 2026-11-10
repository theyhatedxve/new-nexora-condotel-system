import { useState } from "react";
import { useStaffData } from "./useStaffData";
import { useRoomChange } from "./useRoomChange";
import { listStaffRoomTypes } from "../services/roomTypesApi";
import { formatStatus } from "../utils/formatters";

export default function useRoomManagement({ room, blocks }) {
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

      const changingType = draft.roomTypeId !== room.data.roomTypeId;

      const selectedType = types.data.find((type) => type.id === draft.roomTypeId);

      if (!selectedType || (changingType && !selectedType.isActive)) {
        throw new Error("Choose an active room type when changing the type.");
      }

      change.prepare(
        {
          kind: "edit-room",
          roomId: room.data.id,
          roomNumber: draft.roomNumber,
          floor: draft.floor,
          isActive: draft.isActive,
          roomTypeId: changingType ? draft.roomTypeId : undefined,
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
        throw new Error("Choose a different permitted status for an unoccupied room.");
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

  const currentRoom = room.status === "ready" ? room.data : null;

  function changeRoomNumber(event) {
    return edit("roomNumber", event.target.value);
  }

  function changeFloor(event) {
    return edit("floor", event.target.value);
  }

  function changeRoomTypeId(event) {
    return edit("roomTypeId", event.target.value);
  }

  function changeIsActive(event) {
    return edit("isActive", event.target.value === "yes");
  }

  function changeNextStatus(event) {
    return setNextStatus(event.target.value);
  }

  return {
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
  };
}
