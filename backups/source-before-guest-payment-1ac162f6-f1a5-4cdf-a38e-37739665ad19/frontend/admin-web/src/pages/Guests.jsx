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
  guestListSearch,
  listGuestPage,
  parseGuestListQuery,
} from "../services/guestsApi";

import StaffDataState from "../components/StaffDataState";
import { guestName } from "../utils/formatters";

function GuestFilters({
  query,
  onApply,
  onClear,
}) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      onApply(
        guestListSearch({
          q: draft.q,
          page: 1,
          limit: Number(draft.limit),
        }),
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form
      className="guest-filters"
      onSubmit={submit}
    >
      {error && <p role="alert">{error}</p>}

      <fieldset className="guest-filter-fields">
        <legend>Search guests</legend>

        <div>
          <label htmlFor="guest-name-search">
            Guest name
          </label>
          <input
            id="guest-name-search"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                q: event.target.value,
              }))
            }
          />
        </div>

        <div>
          <label htmlFor="guest-page-size">
            Records per page
          </label>
          <select
            id="guest-page-size"
            value={draft.limit}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                limit: event.target.value,
              }))
            }
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="guest-filter-help">
          All search words must match the guest’s first
          or last name. Select Apply search to update results.
        </p>

        <div className="actions guest-filter-actions">
          <button type="submit">
            Apply search
          </button>

          <button
            type="button"
            onClick={onClear}
          >
            Clear search
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function GuestResults({
  query,
  onPage,
}) {
  const state = useStaffData(
    listGuestPage,
    query,
  );

  const resultSummary = useRef(null);
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
      resultSummary.current?.focus();
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
    ? guestListSearch({
        ...query,
        page: data.page,
      })
    : "";

  return (
    <section
      className="record-section"
      aria-labelledby="guest-results-title"
    >
      <div className="records-heading">
        <h2 id="guest-results-title">
          Guest results
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
        label="Guests"
      />

      {data && (
        <>
          <p
            ref={resultSummary}
            role="status"
            tabIndex={-1}
          >
            {data.total === 0
              ? "No guests match the applied search."
              : (
                  "Showing " +
                  start +
                  "–" +
                  end +
                  " of " +
                  data.total +
                  " matching guests."
                )}
          </p>

          {data.items.length > 0 && (
            <>
              <p>
                Most recently updated first.
                Reservation counts include all reservations
                for each guest at this property.
              </p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Matching guests table"
                tabIndex={0}
              >
                <table className="records-table records-table-compact">
                  <caption>
                    Matching guests associated with this property
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Guest</th>
                      <th scope="col">Reservations</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={
                              "/guests/" +
                              encodeURIComponent(item.id)
                            }
                            state={{
                              guestListSearch: listSearch,
                            }}
                          >
                            {guestName(item)}
                          </Link>
                        </td>

                        <td>{item.reservationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="guest-pagination"
                aria-label="Guest result pages"
              >
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() =>
                    onPage(data.page - 1)
                  }
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
                  onClick={() =>
                    onPage(data.page + 1)
                  }
                >
                  Next
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p>
                  Navigation is limited to 10,000 pages.
                  Narrow the search to reach later records.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function Guests() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseGuestListQuery(queryKey),
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
        guestListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  return (
    <section aria-labelledby="guests-title">
      <h1 id="guests-title">Guests</h1>

      <p>
        Guests with reservations at this property.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            onClick={() => setSearchParams("")}
          >
            Clear invalid search
          </button>
        </div>
      ) : (
        <>
          <GuestFilters
            key={queryKey}
            query={parsed.query}
            onApply={(search) =>
              setSearchParams(search)
            }
            onClear={() => setSearchParams("")}
          />

          <GuestResults
            query={parsed.query}
            onPage={changePage}
          />
        </>
      )}
    </section>
  );
}