import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import { useAuth } from "../auth/useAuth";
import { useStaffData } from "../hooks/useStaffData";

import {
  ROOM_LIST_STATUSES,
  listRooms,
  listRoomPage,
  parseRoomListQuery,
  roomListSearch,
} from "../services/roomsApi";

import StaffDataState from "../components/StaffDataState";
import CreateRoomForm from "../components/CreateRoomForm";
import { formatStatus } from "../utils/formatters";

function RoomFilters({
  query,
  catalog,
  onApply,
  onClear,
}) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    status: query.status,
    isActive: query.isActive,
    roomTypeId: query.roomTypeId,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

  const types = Array.from(
    new Map(
      (catalog.data ?? []).map((room) => [
        room.roomTypeId,
        room.roomType,
      ]),
    ).values(),
  ).sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );

  const selectedTypeMissing =
    draft.roomTypeId &&
    !types.some((type) => type.id === draft.roomTypeId);

  function edit(name, value) {
    setDraft((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      onApply(
        roomListSearch({
          ...draft,
          page: 1,
          limit: Number(draft.limit),
        }),
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form className="room-filters" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}

      <fieldset className="room-filter-fields">
        <legend>Filter physical rooms</legend>

        <div>
          <label htmlFor="room-number-filter">
            Room number
          </label>
          <input
            id="room-number-filter"
            type="search"
            maxLength={30}
            value={draft.q}
            onChange={(event) =>
              edit("q", event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="room-status-filter">
            Operational status
          </label>
          <select
            id="room-status-filter"
            value={draft.status}
            onChange={(event) =>
              edit("status", event.target.value)
            }
          >
            <option value="">All statuses</option>

            {ROOM_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="room-active-filter">
            Room active
          </label>
          <select
            id="room-active-filter"
            value={draft.isActive}
            onChange={(event) =>
              edit("isActive", event.target.value)
            }
          >
            <option value="">All rooms</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label htmlFor="room-type-filter">
            Room type
          </label>
          <select
            id="room-type-filter"
            value={draft.roomTypeId}
            disabled={catalog.status !== "ready"}
            onChange={(event) =>
              edit("roomTypeId", event.target.value)
            }
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
          <label htmlFor="room-page-size">
            Records per page
          </label>
          <select
            id="room-page-size"
            value={draft.limit}
            onChange={(event) =>
              edit("limit", event.target.value)
            }
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="actions room-filter-actions">
          <button type="submit">Apply filters</button>

          <button type="button" onClick={onClear}>
            Clear filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function RoomDirectory({
  query,
  queryKey,
  onApply,
  onClear,
  onPage,
}) {
  const { user } = useAuth();

  const catalog = useStaffData(listRooms);
  const records = useStaffData(listRoomPage, query);

  const resultSummary = useRef(null);
  const lastQuery = useRef(query);
  const focusAfterRefresh = useRef(false);

  const canManage = [
    "ADMIN",
    "MANAGER",
  ].includes(user?.role);

  useEffect(() => {
    if (
      records.status === "ready" &&
      records.data.page !== query.page
    ) {
      onPage(records.data.page, true);
    }
  }, [
    records.status,
    records.data,
    query.page,
    onPage,
  ]);

  useEffect(() => {
    if (
      records.status === "ready" &&
      (
        lastQuery.current !== query ||
        focusAfterRefresh.current
      )
    ) {
      resultSummary.current?.focus();
      lastQuery.current = query;
      focusAfterRefresh.current = false;
    }
  }, [records.status, records.data, query]);

  function refreshAll() {
    catalog.reload();
    records.reload();
  }

  const data =
    records.status === "ready" ? records.data : null;

  const start = data?.items.length
    ? (data.page - 1) * data.limit + 1
    : 0;

  const end = data?.items.length
    ? start + data.items.length - 1
    : 0;

  const listSearch = roomListSearch({
    ...query,
    page: data?.page ?? query.page,
  });

  const creationCatalog = {
    ...catalog,
    reload: refreshAll,
  };

  return (
    <>
      {canManage && (
        <p>
          <Link to="/rooms/types">
            Manage room types and nightly rates
          </Link>
        </p>
      )}

      <StaffDataState
        state={catalog}
        label="Room filter options"
      />

      <RoomFilters
        key={queryKey}
        query={query}
        catalog={catalog}
        onApply={onApply}
        onClear={onClear}
      />

      <section
        className="record-section"
        aria-labelledby="room-results-title"
      >
        <div className="records-heading">
          <h2 id="room-results-title">Room results</h2>

          <button
            type="button"
            disabled={records.loading || catalog.loading}
            onClick={() => {
              focusAfterRefresh.current = true;
              refreshAll();
            }}
          >
            Refresh rooms
          </button>
        </div>

        <StaffDataState
          state={records}
          label="Rooms"
        />

        {data && (
          <>
            <p
              ref={resultSummary}
              role="status"
              tabIndex={-1}
            >
              {data.total === 0
                ? "No rooms match the applied filters."
                : (
                    "Showing " +
                    start +
                    "–" +
                    end +
                    " of " +
                    data.total +
                    " matching rooms."
                  )}
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
                      Matching physical rooms, by room number
                    </caption>

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
                              to={
                                "/rooms/" +
                                encodeURIComponent(room.id)
                              }
                              state={{
                                roomListSearch: listSearch,
                              }}
                            >
                              {room.roomNumber}
                            </Link>
                          </td>

                          <td>
                            {room.floor || "Not recorded"}
                          </td>

                          <td>{room.roomType.name}</td>
                          <td>{room.roomType.capacity}</td>
                          <td>{formatStatus(room.status)}</td>
                          <td>{room.isActive ? "Yes" : "No"}</td>
                          <td>
                            {room.roomType.isActive ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav
                  className="room-pagination"
                  aria-label="Room result pages"
                >
                  <button
                    type="button"
                    disabled={data.page <= 1}
                    onClick={() => onPage(data.page - 1)}
                  >
                    Previous
                  </button>

                  <span>
                    Page {data.page} of {data.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      data.page >=
                      Math.min(data.totalPages, 10000)
                    }
                    onClick={() => onPage(data.page + 1)}
                  >
                    Next
                  </button>
                </nav>

                {data.totalPages > 10000 && (
                  <p>
                    Navigation is limited to 10,000 pages.
                    Narrow the filters to reach later records.
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

export default function Rooms() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseRoomListQuery(queryKey),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure.message,
      };
    }
  }, [queryKey]);

  const changePage = useCallback(
    (page, replace = false) => {
      if (!parsed.query) return;

      setSearchParams(
        roomListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  return (
    <section aria-labelledby="rooms-title">
      <h1 id="rooms-title">Rooms</h1>

      <p>
        Current operational status is shown below.
        Stay availability also depends on dates,
        reservations, assignments, and dated blocks.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            onClick={() => setSearchParams("")}
          >
            Clear invalid filters
          </button>
        </div>
      ) : (
        <RoomDirectory
          query={parsed.query}
          queryKey={queryKey}
          onApply={(search) => setSearchParams(search)}
          onClear={() => setSearchParams("")}
          onPage={changePage}
        />
      )}
    </section>
  );
}