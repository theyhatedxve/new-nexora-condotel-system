import useRoomBlockManagement from "../hooks/useRoomBlockManagement.js";

export default function RoomBlockManagement({ room, blocks, change }) {
  const {
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
  } = useRoomBlockManagement({ room, blocks, change });

  return (
    <section className="record-section" aria-labelledby="manage-blocks-title">
      <h3 id="manage-blocks-title">Manage dated blocks</h3>

      <p>
        The start date is included. The end date is excluded. Reservation and inventory
        conflicts are checked by the backend.
      </p>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepareSave}>
        <fieldset className="action-fields" disabled={change.disabled}>
          <legend>Create or edit a block</legend>

          <label htmlFor="manage-block-id">Block</label>
          <select id="manage-block-id" value={blockId} onChange={changeSelectedBlock}>
            <option value="">Create a new block</option>

            {editable.map((block) => (
              <option key={block.id} value={block.id}>
                {block.startDate.slice(0, 10)} to {block.endDate.slice(0, 10)} —{" "}
                {block.reason}
              </option>
            ))}
          </select>

          {blockId && (
            <button type="button" onClick={reloadSelectedBlock} disabled={!selected}>
              Load current block values
            </button>
          )}

          <label htmlFor="block-start-date">Start date</label>
          <input
            id="block-start-date"
            type="date"
            required
            value={startDate}
            onChange={changeStartDate}
          />

          <label htmlFor="block-end-date">End date, exclusive</label>
          <input
            id="block-end-date"
            type="date"
            required
            value={endDate}
            onChange={changeEndDate}
          />

          <label htmlFor="block-reason">Reason</label>
          <textarea
            id="block-reason"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            value={reason}
            onChange={changeReason}
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
