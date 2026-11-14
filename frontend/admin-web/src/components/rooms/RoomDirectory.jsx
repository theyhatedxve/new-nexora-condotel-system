import { Link } from "react-router";
import {
  ArrowRight,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StaffDataState from "../StaffDataState";
import CreateRoomForm from "../CreateRoomForm";
import { formatStatus } from "../../utils/formatters";
import useRoomDirectory from "../../hooks/useRoomDirectory.js";
import { RoomFilters } from "./RoomFilters.jsx";

export function RoomDirectory({ query, queryKey, onApply, onClear, onPage }) {
  const {
    catalog,
    records,
    resultSummary,
    canManage,
    data,
    start,
    end,
    listSearch,
    creationCatalog,
    refreshResults,
    previousPage,
    nextPage,
  } = useRoomDirectory({ query, onPage });

  return (
    <>
      {canManage && (
        <div className="rooms-screen__tools">
          <Link
            className="rooms-screen__secondary"
            to="/rooms/types"
          >
            <BedDouble size={18} aria-hidden="true" />
            Manage room types and nightly rates
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      <StaffDataState state={catalog} label="Room filter options" />

      <RoomFilters
        key={queryKey}
        query={query}
        catalog={catalog}
        onApply={onApply}
        onClear={onClear}
      />

      <section
        className="record-section rooms-screen__results"
        aria-labelledby="room-results-title"
      >
        <div className="records-heading">
          <div>
            <h2 id="room-results-title">Room inventory</h2>

            <p className="rooms-screen__muted">
              Open a room to view its details and permitted management actions.
            </p>
          </div>

          <button
            type="button"
            className="rooms-screen__secondary"
            disabled={records.loading || catalog.loading}
            onClick={refreshResults}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh rooms
          </button>
        </div>

        <StaffDataState state={records} label="Rooms" />

        {data && (
          <>
            <p
              className="rooms-screen__summary"
              ref={resultSummary}
              role="status"
              tabIndex={-1}
            >
              {data.total === 0
                ? "No rooms match the applied filters."
                : `Showing ${start}–${end} of ${data.total} matching rooms.`}
            </p>

            {data.items.length > 0 && (
              <>
                <div
                  className="records-scroll"
                  role="region"
                  aria-label="Matching rooms table"
                  tabIndex={0}
                >
                  <table className="records-table">
                    <caption>
                      Matching physical rooms, ordered by room number
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">Room</th>
                        <th scope="col">Room type</th>
                        <th scope="col">Floor</th>
                        <th scope="col">Capacity</th>
                        <th scope="col">Operational status</th>
                        <th scope="col">Room active</th>
                        <th scope="col">Type active</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.items.map((room) => (
                        <tr key={room.id}>
                          <th scope="row">
                            <Link
                              className="rooms-screen__room-link"
                              to={"/rooms/" + encodeURIComponent(room.id)}
                              state={{ roomListSearch: listSearch }}
                            >
                              {room.roomNumber}
                            </Link>
                          </th>

                          <td>{room.roomType.name}</td>
                          <td>{room.floor || "Not recorded"}</td>
                          <td>{room.roomType.capacity}</td>

                          <td>
                            <span
                              className="rooms-screen__badge"
                              data-status={room.status}
                            >
                              {formatStatus(room.status)}
                            </span>
                          </td>

                          <td>
                            <span
                              className="rooms-screen__badge"
                              data-active={String(room.isActive)}
                            >
                              {room.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td>
                            <span
                              className="rooms-screen__badge"
                              data-active={String(room.roomType.isActive)}
                            >
                              {room.roomType.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td>
                            <Link
                              className="rooms-screen__details-link"
                              to={"/rooms/" + encodeURIComponent(room.id)}
                              state={{ roomListSearch: listSearch }}
                              aria-label={`View details for room ${room.roomNumber}`}
                            >
                              View details
                              <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav className="room-pagination" aria-label="Room result pages">
                  <button
                    type="button"
                    className="rooms-screen__secondary"
                    disabled={data.page <= 1}
                    onClick={previousPage}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Previous
                  </button>

                  <span className="rooms-screen__page-number">
                    Page {data.page} of {data.totalPages}
                  </span>

                  <button
                    type="button"
                    className="rooms-screen__secondary"
                    disabled={data.page >= Math.min(data.totalPages, 10000)}
                    onClick={nextPage}
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>

                {data.totalPages > 10000 && (
                  <p className="rooms-screen__muted">
                    Navigation is limited to 10,000 pages. Narrow the filters to reach
                    later records.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>

      {canManage && (
        <CreateRoomForm
          rooms={creationCatalog}
          returnSearch={listSearch}
        />
      )}
    </>
  );
}
