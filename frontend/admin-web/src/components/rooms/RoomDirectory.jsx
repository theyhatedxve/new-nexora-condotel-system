import { Link } from "react-router";
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
        <p>
          <Link to="/rooms/types">Manage room types and nightly rates</Link>
        </p>
      )}

      <StaffDataState state={catalog} label="Room filter options" />

      <RoomFilters
        key={queryKey}
        query={query}
        catalog={catalog}
        onApply={onApply}
        onClear={onClear}
      />

      <section className="record-section" aria-labelledby="room-results-title">
        <div className="records-heading">
          <h2 id="room-results-title">Room results</h2>

          <button
            type="button"
            disabled={records.loading || catalog.loading}
            onClick={refreshResults}
          >
            Refresh rooms
          </button>
        </div>

        <StaffDataState state={records} label="Rooms" />

        {data && (
          <>
            <p ref={resultSummary} role="status" tabIndex={-1}>
              {data.total === 0
                ? "No rooms match the applied filters."
                : "Showing " +
                  start +
                  "–" +
                  end +
                  " of " +
                  data.total +
                  " matching rooms."}
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
                    <caption>Matching physical rooms, by room number</caption>

                    <thead>
                      <tr>
                        <th scope="col">Room</th>
                        <th scope="col">Floor</th>
                        <th scope="col">Room type</th>
                        <th scope="col">Capacity</th>
                        <th scope="col">Status</th>
                        <th scope="col">Room active</th>
                        <th scope="col">Type active</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.items.map((room) => (
                        <tr key={room.id}>
                          <td>
                            <Link
                              to={"/rooms/" + encodeURIComponent(room.id)}
                              state={{
                                roomListSearch: listSearch,
                              }}
                            >
                              {room.roomNumber}
                            </Link>
                          </td>

                          <td>{room.floor || "Not recorded"}</td>

                          <td>{room.roomType.name}</td>
                          <td>{room.roomType.capacity}</td>
                          <td>{formatStatus(room.status)}</td>
                          <td>{room.isActive ? "Yes" : "No"}</td>
                          <td>{room.roomType.isActive ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav className="room-pagination" aria-label="Room result pages">
                  <button type="button" disabled={data.page <= 1} onClick={previousPage}>
                    Previous
                  </button>

                  <span>
                    Page {data.page} of {data.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={data.page >= Math.min(data.totalPages, 10000)}
                    onClick={nextPage}
                  >
                    Next
                  </button>
                </nav>

                {data.totalPages > 10000 && (
                  <p>
                    Navigation is limited to 10,000 pages. Narrow the filters to reach
                    later records.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>

      {canManage && <CreateRoomForm rooms={creationCatalog} returnSearch={listSearch} />}
    </>
  );
}
