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

import { useStaffData } from "../hooks/useStaffData";

import {
  RESERVATION_LIST_STATUSES,
  listReservationPage,
  parseReservationListQuery,
  reservationListSearch,
} from "../services/reservationsApi";

import StaffDataState from "../components/StaffDataState";

import {
  formatStayDate,
  formatStatus,
  guestName,
} from "../utils/formatters";

function ReservationFilters({
  query,
  onApply,
  onClear,
}) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    status: query.status,
    checkInFrom: query.checkInFrom,
    checkInTo: query.checkInTo,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

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
      const search = reservationListSearch({
        ...draft,
        page: 1,
        limit: Number(draft.limit),
      });

      onApply(search);
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form
      className="reservation-filters"
      onSubmit={submit}
    >
      {error && <p role="alert">{error}</p>}

      <fieldset className="reservation-filter-fields">
        <legend>Filter reservations</legend>

        <div>
          <label htmlFor="reservation-reference-filter">
            Booking reference
          </label>
          <input
            id="reservation-reference-filter"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={(event) =>
              edit("q", event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="reservation-status-filter">
            Reservation status
          </label>
          <select
            id="reservation-status-filter"
            value={draft.status}
            onChange={(event) =>
              edit("status", event.target.value)
            }
          >
            <option value="">All statuses</option>

            {RESERVATION_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reservation-check-in-from">
            Check-in from
          </label>
          <input
            id="reservation-check-in-from"
            type="date"
            value={draft.checkInFrom}
            onChange={(event) =>
              edit("checkInFrom", event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="reservation-check-in-to">
            Check-in through
          </label>
          <input
            id="reservation-check-in-to"
            type="date"
            value={draft.checkInTo}
            onChange={(event) =>
              edit("checkInTo", event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="reservation-page-size">
            Records per page
          </label>
          <select
            id="reservation-page-size"
            value={draft.limit}
            onChange={(event) =>
              edit("limit", event.target.value)
            }
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="reservation-filter-help">
          Both selected check-in dates are included.
          Apply filters to update the results.
        </p>

        <div className="actions reservation-filter-actions">
          <button type="submit">Apply filters</button>

          <button
            type="button"
            onClick={onClear}
          >
            Clear filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function ReservationResults({
  query,
  onPage,
}) {
  const state = useStaffData(
    listReservationPage,
    query,
  );

  const summaryHeading = useRef(null);
  const lastQuery = useRef(query);
  const focusAfterRefresh = useRef(false);

  useEffect(() => {
    if (
      state.status === "ready" &&
      state.data.page !== query.page
    ) {
      onPage(state.data.page, true);
    }
  }, [
    state.status,
    state.data,
    query.page,
    onPage,
  ]);

  useEffect(() => {
    if (
      state.status === "ready" &&
      (
        lastQuery.current !== query ||
        focusAfterRefresh.current
      )
    ) {
      summaryHeading.current?.focus();
      lastQuery.current = query;
      focusAfterRefresh.current = false;
    }
  }, [state.status, state.data, query]);

  const data =
    state.status === "ready" ? state.data : null;

  const start = data?.items.length
    ? (data.page - 1) * data.limit + 1
    : 0;

  const end = data?.items.length
    ? start + data.items.length - 1
    : 0;

  const listSearch = data
    ? reservationListSearch({
        ...query,
        page: data.page,
      })
    : "";

  return (
    <section
      className="record-section"
      aria-labelledby="reservation-results-title"
    >
      <div className="records-heading">
        <h2 id="reservation-results-title">
          Reservation results
        </h2>

        <button
          type="button"
          disabled={state.loading}
          onClick={() => {
            focusAfterRefresh.current = true;
            state.reload();
          }}
        >
          Refresh results
        </button>
      </div>

      <StaffDataState
        state={state}
        label="Reservations"
      />

      {data && (
        <>
          <p
            ref={summaryHeading}
            tabIndex={-1}
            role="status"
          >
            {data.total === 0
              ? "No reservations match the applied filters."
              : (
                  "Showing " +
                  start +
                  "–" +
                  end +
                  " of " +
                  data.total +
                  " matching reservations."
                )}
          </p>

          {data.items.length > 0 && (
            <>
              <p>
                Most recently created first.
              </p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Filtered reservations table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Matching reservations</caption>

                  <thead>
                    <tr>
                      <th scope="col">Booking reference</th>
                      <th scope="col">Guest</th>
                      <th scope="col">Room type</th>
                      <th scope="col">Check-in</th>
                      <th scope="col">Check-out</th>
                      <th scope="col">Guests</th>
                      <th scope="col">Reservation status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={
                              "/reservations/" +
                              encodeURIComponent(item.id)
                            }
                            state={{
                              reservationListSearch: listSearch,
                            }}
                          >
                            {item.reservationNumber}
                          </Link>
                        </td>

                        <td>
                          <Link
                            to={
                              "/guests/" +
                              encodeURIComponent(
                                item.guest.id,
                              )
                            }
                          >
                            {guestName(item.guest)}
                          </Link>
                        </td>

                        <td>{item.roomType.name}</td>

                        <td>
                          {formatStayDate(item.checkInDate)}
                        </td>

                        <td>
                          {formatStayDate(item.checkOutDate)}
                        </td>

                        <td>{item.guestCount}</td>

                        <td>
                          {formatStatus(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="reservation-pagination"
                aria-label="Reservation result pages"
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
  );
}

export default function Reservations() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseReservationListQuery(queryKey),
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
        reservationListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  return (
    <section aria-labelledby="reservations-title">
      <h1 id="reservations-title">Reservations</h1>

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
        <>
          <ReservationFilters
            key={queryKey}
            query={parsed.query}
            onApply={(search) =>
              setSearchParams(search)
            }
            onClear={() => setSearchParams("")}
          />

          <ReservationResults
            query={parsed.query}
            onPage={changePage}
          />
        </>
      )}
    </section>
  );
}