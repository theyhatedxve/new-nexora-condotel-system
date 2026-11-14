import { Search, SlidersHorizontal } from "lucide-react";
import { ROOM_LIST_STATUSES } from "../../services/roomsApi";
import { formatStatus } from "../../utils/formatters";
import useRoomFilters from "../../hooks/useRoomFilters.js";

export function RoomFilters({ query, catalog, onApply, onClear }) {
  const {
    draft,
    error,
    types,
    selectedTypeMissing,
    submit,
    changeQ,
    changeStatus,
    changeIsActive,
    changeRoomTypeId,
    changeLimit,
  } = useRoomFilters({
    query,
    catalog,
    onApply,
  });

  return (
    <form
      className="room-filters"
      onSubmit={submit}
      aria-describedby="room-filter-help"
    >
      <fieldset className="room-filter-fields">
        <legend>
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter physical rooms
        </legend>

        {error && (
          <p className="rooms-screen__filter-error" role="alert">
            {error}
          </p>
        )}

        <div className="rooms-screen__search-field">
          <label htmlFor="room-number-filter">Room number</label>

          <div className="rooms-screen__search-control">
            <Search size={18} aria-hidden="true" />

            <input
              id="room-number-filter"
              type="search"
              placeholder="Search room number"
              maxLength={30}
              value={draft.q}
              onChange={changeQ}
            />
          </div>
        </div>

        <div>
          <label htmlFor="room-type-filter">Room type</label>

          <select
            id="room-type-filter"
            value={draft.roomTypeId}
            disabled={catalog.status !== "ready"}
            onChange={changeRoomTypeId}
          >
            <option value="">All room types</option>

            {selectedTypeMissing && (
              <option value={draft.roomTypeId}>
                Selected type not found in current catalog
              </option>
            )}

            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.isActive ? "" : " — inactive"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="room-status-filter">Operational status</label>
          <select id="room-status-filter" value={draft.status} onChange={changeStatus}>
            <option value="">All statuses</option>

            {ROOM_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="room-active-filter">Room active</label>
          <select
            id="room-active-filter"
            value={draft.isActive}
            onChange={changeIsActive}
          >
            <option value="">All rooms</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label htmlFor="room-page-size">Records per page</label>
          <select id="room-page-size" value={draft.limit} onChange={changeLimit}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="actions room-filter-actions">
          <button type="submit" className="rooms-screen__primary">
            <Search size={16} aria-hidden="true" />
            Apply filters
          </button>

          <button
            type="button"
            className="rooms-screen__secondary"
            onClick={onClear}
          >
            Clear filters
          </button>
        </div>

        <p id="room-filter-help" className="rooms-screen__filter-help">
          Apply filters to update the results. Room-type choices come from the
          current physical-room catalog.
        </p>
      </fieldset>
    </form>
  );
}
