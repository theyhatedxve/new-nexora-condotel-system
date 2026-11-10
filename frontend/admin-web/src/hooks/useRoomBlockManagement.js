import { useState } from "react";

export default function useRoomBlockManagement({ room, blocks, change }) {
  const [blockId, setBlockId] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [reason, setReason] = useState("");

  const [selectedVersion, setSelectedVersion] = useState("");

  const [error, setError] = useState("");

  const records = blocks.data ?? [];

  const editable = records.filter((block) => block.canceledAt === null);

  const selected = editable.find((block) => block.id === blockId);

  function chooseBlock(id) {
    setBlockId(id);
    setError("");

    const block = editable.find((item) => item.id === id);

    setStartDate(block?.startDate.slice(0, 10) ?? "");
    setEndDate(block?.endDate.slice(0, 10) ?? "");
    setReason(block?.reason ?? "");
    setSelectedVersion(block ? JSON.stringify(block) : "");
  }

  function requireCurrentBlock() {
    if (!selected || JSON.stringify(selected) !== selectedVersion) {
      throw new Error(
        "The selected block changed. Reload its current values before reviewing another change.",
      );
    }

    return selected;
  }

  function prepareSave(event) {
    event.preventDefault();
    setError("");

    try {
      if (!blockId && !room.isActive) {
        throw new Error("Reactivate the room before creating a block.");
      }

      if (blockId) requireCurrentBlock();

      change.prepare(
        {
          kind: blockId ? "edit-block" : "create-block",
          roomId: room.id,
          blockId: blockId || undefined,
          startDate,
          endDate,
          reason,
        },
        blockId ? "Edit room block" : "Create room block",
        [
          "Room: " + room.roomNumber,
          "Start date: " + startDate,
          "End date, exclusive: " + endDate,
          "Reason: " + reason.trim().replace(/\s+/g, " "),
        ],
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function prepareCancel(event) {
    setError("");

    try {
      const block = requireCurrentBlock();

      change.prepare(
        {
          kind: "cancel-block",
          roomId: room.id,
          blockId: block.id,
        },
        "Cancel room block",
        [
          "Room: " + room.roomNumber,
          "Start date: " + block.startDate.slice(0, 10),
          "End date, exclusive: " + block.endDate.slice(0, 10),
          "Recorded reason: " + block.reason,
          "The block will remain in history.",
        ],
        event.currentTarget,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function changeSelectedBlock(event) {
    return chooseBlock(event.target.value);
  }

  function reloadSelectedBlock() {
    return chooseBlock(blockId);
  }

  function changeStartDate(event) {
    return setStartDate(event.target.value);
  }

  function changeEndDate(event) {
    return setEndDate(event.target.value);
  }

  function changeReason(event) {
    return setReason(event.target.value);
  }

  return {
    blockId,
    startDate,
    endDate,
    reason,
    error,
    editable,
    selected,
    prepareSave,
    prepareCancel,
    changeSelectedBlock,
    reloadSelectedBlock,
    changeStartDate,
    changeEndDate,
    changeReason,
  };
}
