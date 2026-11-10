import RoomChangeReview from "./RoomChangeReview";
import useRoomTypeManagement from "../hooks/useRoomTypeManagement.js";

export default function RoomTypeManagement({ records }) {
  const {
    change,
    roomTypeId,
    draft,
    error,
    items,
    current,
    prepare,
    changeSelectedType,
    reloadSelectedType,
    startNewType,
    changeName,
    changeDescription,
    changeCapacity,
    changeNightlyRate,
    changeIsActive,
  } = useRoomTypeManagement({ records });

  return (
    <section
      className="record-section room-management"
      aria-labelledby="type-management-title"
    >
      <h2 id="type-management-title">Create or edit a room type</h2>

      <p>
        Changes to current rates do not recalculate existing reservation prices. Capacity
        and deactivation requests are checked against existing commitments.
      </p>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset className="action-fields" disabled={change.disabled}>
          <legend>{roomTypeId ? "Edit room type" : "New room type"}</legend>

          <label htmlFor="managed-room-type">Room type to manage</label>
          <select id="managed-room-type" value={roomTypeId} onChange={changeSelectedType}>
            <option value="">Create a new room type</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? "" : " — inactive"}
              </option>
            ))}
          </select>

          {roomTypeId ? (
            <button type="button" disabled={!current} onClick={reloadSelectedType}>
              Load current room-type values
            </button>
          ) : (
            <button type="button" onClick={startNewType}>
              Clear new-type inputs
            </button>
          )}

          <label htmlFor="type-name">Name</label>
          <input
            id="type-name"
            required
            maxLength={100}
            value={draft.name}
            onChange={changeName}
          />

          <label htmlFor="type-description">Description</label>
          <textarea
            id="type-description"
            maxLength={2000}
            rows={4}
            value={draft.description}
            onChange={changeDescription}
          />

          <label htmlFor="type-capacity">Guest capacity</label>
          <input
            id="type-capacity"
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            maxLength={10}
            value={draft.capacity}
            onChange={changeCapacity}
          />

          <label htmlFor="type-rate">Base nightly rate in PHP</label>
          <input
            id="type-rate"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            required
            maxLength={11}
            aria-describedby="type-rate-help"
            value={draft.nightlyRate}
            onChange={changeNightlyRate}
          />

          <p id="type-rate-help">
            Use up to two decimal places, without commas. Example: 2500.50.
          </p>

          {roomTypeId && (
            <>
              <label htmlFor="type-active">Room type active</label>
              <select
                id="type-active"
                value={draft.isActive ? "yes" : "no"}
                onChange={changeIsActive}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </>
          )}

          <button type="submit">
            {roomTypeId ? "Review room-type edit" : "Review new room type"}
          </button>
        </fieldset>
      </form>

      <RoomChangeReview
        change={change}
        reviewMessage={
          "Fresh room types are loaded. Compare the table " +
          "with the requested name, description, capacity, " +
          "nightly rate, and active state."
        }
      />
    </section>
  );
}
