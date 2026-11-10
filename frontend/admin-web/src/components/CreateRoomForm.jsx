import StaffDataState from "./StaffDataState";
import RoomChangeReview from "./RoomChangeReview";
import { Link } from "react-router";
import { formatStatus } from "../utils/formatters";
import useCreateRoomForm from "../hooks/useCreateRoomForm.js";

export default function CreateRoomForm({ rooms, returnSearch = "" }) {
  const {
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
  } = useCreateRoomForm({ rooms });

  return (
    <section
      className="record-section room-management"
      aria-labelledby="create-room-title"
    >
      <h2 id="create-room-title">Create room</h2>

      <StaffDataState state={types} label="Room types" />

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset className="action-fields" disabled={change.disabled}>
          <legend>New physical room</legend>

          <label htmlFor="new-room-number">Room number</label>
          <input
            id="new-room-number"
            required
            maxLength={30}
            value={roomNumber}
            onChange={changeRoomNumber}
          />

          <label htmlFor="new-room-floor">Floor</label>
          <input
            id="new-room-floor"
            maxLength={30}
            value={floor}
            onChange={changeFloor}
          />

          <label htmlFor="new-room-type">Room type</label>
          <select
            id="new-room-type"
            required
            value={roomTypeId}
            onChange={changeRoomTypeId}
          >
            <option value="">Choose a room type</option>

            {activeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} — capacity {type.capacity}
              </option>
            ))}
          </select>

          <button type="submit">Review new room</button>
        </fieldset>
      </form>

      {types.status === "ready" && activeTypes.length === 0 && (
        <p role="status">No active room types are available for creation.</p>
      )}

      {showCatalogReview && (
        <section
          className="record-section"
          aria-labelledby="creation-catalog-review-title"
        >
          <h3 id="creation-catalog-review-title">Current room catalog match</h3>

          <p>
            This review uses the complete catalog, including rooms hidden by the current
            list filters. Compare it with the requested change.
          </p>

          <StaffDataState state={rooms} label="Current room catalog" />

          {rooms.status === "ready" &&
            (catalogMatch ? (
              <dl className="record-fields">
                <div>
                  <dt>Room</dt>
                  <dd>
                    <Link
                      to={"/rooms/" + encodeURIComponent(catalogMatch.id)}
                      state={{
                        roomListSearch: returnSearch,
                      }}
                    >
                      {catalogMatch.roomNumber}
                    </Link>
                  </dd>
                </div>

                <div>
                  <dt>Floor</dt>
                  <dd>{catalogMatch.floor || "Not recorded"}</dd>
                </div>

                <div>
                  <dt>Room type</dt>
                  <dd>{catalogMatch.roomType.name}</dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>{formatStatus(catalogMatch.status)}</dd>
                </div>

                <div>
                  <dt>Room active</dt>
                  <dd>{catalogMatch.isActive ? "Yes" : "No"}</dd>
                </div>
              </dl>
            ) : (
              <p role="status">
                No matching room is present in the currently loaded catalog. Reload
                records for review before deciding whether another submission is needed.
              </p>
            ))}
        </section>
      )}

      <RoomChangeReview change={change} />
    </section>
  );
}
