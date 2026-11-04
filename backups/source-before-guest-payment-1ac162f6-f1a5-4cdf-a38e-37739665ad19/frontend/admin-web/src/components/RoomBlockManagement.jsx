import { useState } from "react";

export default function RoomBlockManagement({
  room,
  blocks,
  change,
}) {
  const [blockId, setBlockId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [error, setError] = useState("");

  const records = blocks.data ?? [];
  const editable = records.filter(
    (block) => block.canceledAt === null,
  );

  const selected = editable.find(
    (block) => block.id === blockId,
  );

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
    if (
      !selected ||
      JSON.stringify(selected) !== selectedVersion
    ) {
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
        throw new Error(
          "Reactivate the room before creating a block.",
        );
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

  return (
    <section
      className="record-section"
      aria-labelledby="manage-blocks-title"
    >
      <h3 id="manage-blocks-title">Manage dated blocks</h3>

      <p>
        The start date is included. The end date is
        excluded. Reservation and inventory conflicts
        are checked by the backend.
      </p>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepareSave}>
        <fieldset
          className="action-fields"
          disabled={change.disabled}
        >
          <legend>Create or edit a block</legend>

          <label htmlFor="manage-block-id">
            Block
          </label>
          <select
            id="manage-block-id"
            value={blockId}
            onChange={(event) =>
              chooseBlock(event.target.value)
            }
          >
            <option value="">Create a new block</option>

            {editable.map((block) => (
              <option key={block.id} value={block.id}>
                {block.startDate.slice(0, 10)} to{" "}
                {block.endDate.slice(0, 10)} — {block.reason}
              </option>
            ))}
          </select>

          {blockId && (
            <button
              type="button"
              onClick={() => chooseBlock(blockId)}
              disabled={!selected}
            >
              Load current block values
            </button>
          )}

          <label htmlFor="block-start-date">
            Start date
          </label>
          <input
            id="block-start-date"
            type="date"
            required
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
          />

          <label htmlFor="block-end-date">
            End date, exclusive
          </label>
          <input
            id="block-end-date"
            type="date"
            required
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
          />

          <label htmlFor="block-reason">Reason</label>
          <textarea
            id="block-reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
          />

          <button type="submit">
            {blockId ? "Review block edit" : "Review new block"}
          </button>

          {blockId && (
            <button
              type="button"
              className="danger-button"
              onClick={prepareCancel}
              disabled={!selected}
            >
              Review block cancellation
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}