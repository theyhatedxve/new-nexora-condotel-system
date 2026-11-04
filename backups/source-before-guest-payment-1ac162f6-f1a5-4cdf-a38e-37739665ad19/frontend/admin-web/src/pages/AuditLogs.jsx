import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router";

import StaffDataState from "../components/StaffDataState";

import {
  useStaffData,
} from "../hooks/useStaffData";

import {
  auditSearch,
  listAuditPage,
  parseAuditQuery,
} from "../services/auditApi";

import "../styles/audit-logs.css";

const timestamp = new Intl.DateTimeFormat(
  "en-PH",
  {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Manila",
  },
);

function AuditFilters({
  query,
  onApply,
  onClear,
}) {
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(
      event.currentTarget,
    );

    try {
      const next = {
        from: String(
          form.get("from") ?? "",
        ),
        to: String(
          form.get("to") ?? "",
        ),
        action: String(
          form.get("action") ?? "",
        ).trim(),
        entityType: String(
          form.get("entityType") ?? "",
        ).trim(),
        page: 1,
        limit: query.limit,
      };

      const checked = parseAuditQuery(
        auditSearch(next),
      );

      onApply(checked);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Check the audit filters.",
      );
    }
  }

  return (
    <form
      className="audit-filters"
      onSubmit={submit}
    >
      <div className="audit-field">
        <label htmlFor="audit-from">
          From
        </label>

        <input
          id="audit-from"
          name="from"
          type="date"
          defaultValue={query.from}
          aria-describedby="audit-date-help"
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-to">
          To
        </label>

        <input
          id="audit-to"
          name="to"
          type="date"
          defaultValue={query.to}
          aria-describedby="audit-date-help"
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-action">
          Exact action
        </label>

        <input
          id="audit-action"
          name="action"
          type="text"
          maxLength={100}
          defaultValue={query.action}
          aria-describedby="audit-exact-help"
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-entity-type">
          Exact record type
        </label>

        <input
          id="audit-entity-type"
          name="entityType"
          type="text"
          maxLength={100}
          defaultValue={query.entityType}
          aria-describedby="audit-exact-help"
        />
      </div>

      <div className="audit-filter-actions">
        <button type="submit">
          Apply filters
        </button>

        <button
          type="button"
          onClick={onClear}
        >
          Clear filters
        </button>
      </div>

      <p
        id="audit-date-help"
        className="audit-filter-help"
      >
        Leave both dates blank for all history,
        or provide both. Both selected dates
        are included using Philippine time.
      </p>

      <p
        id="audit-exact-help"
        className="audit-filter-help"
      >
        Copy action and record type values
        from the table for exact filtering.
      </p>

      {error && (
        <p
          role="alert"
          className="audit-filter-help feedback"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function AuditDirectory({
  query,
  onChange,
}) {
  const state = useStaffData(
    listAuditPage,
    query,
  );

  const resultsRef = useRef(null);
  const focusResults = useRef(false);

  const data =
    state.status === "ready"
      ? state.data
      : null;

  useEffect(() => {
    if (!data) return;

    if (data.page !== query.page) {
      onChange(
        {
          ...query,
          page: data.page,
        },
        true,
      );

      return;
    }

    if (focusResults.current) {
      focusResults.current = false;
      resultsRef.current?.focus();
    }
  }, [data, query, onChange]);

  function navigate(next) {
    focusResults.current = true;
    onChange(next);
  }

  function clearFilters() {
    navigate(
      parseAuditQuery(""),
    );
  }

  function refresh() {
    focusResults.current = true;
    state.reload();
  }

  const first =
    data && data.total > 0
      ? (data.page - 1) * data.limit + 1
      : 0;

  const last =
    data && data.total > 0
      ? first + data.items.length - 1
      : 0;

  return (
    <>
      <AuditFilters
        key={auditSearch(query)}
        query={query}
        onApply={navigate}
        onClear={clearFilters}
      />

      <div className="audit-toolbar">
        <button
          type="button"
          onClick={refresh}
          disabled={state.loading}
        >
          Refresh history
        </button>

        <div className="audit-page-size">
          <label htmlFor="audit-limit">
            Records per page
          </label>

          <select
            id="audit-limit"
            value={query.limit}
            onChange={(event) =>
              navigate({
                ...query,
                page: 1,
                limit: Number(
                  event.target.value,
                ),
              })
            }
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <StaffDataState
        state={state}
        label="audit history"
      />

      {data && data.page === query.page && (
        <>
          <p
            ref={resultsRef}
            tabIndex={-1}
            className="audit-results-summary"
            role="status"
          >
            {data.total === 0
              ? "No recorded audit events match these filters."
              : `Showing ${first}–${last} of ${data.total} recorded events.`}
          </p>

          {data.total > 0 && (
            <>
              <div
                className="records-scroll audit-table-scroll"
                role="region"
                aria-label="Audit history table"
                tabIndex={0}
              >
                <table className="records-table audit-table">
                  <caption>
                    Recorded audit events,
                    newest first. Times use
                    Asia/Manila.
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">
                        Timestamp
                      </th>
                      <th scope="col">
                        Action
                      </th>
                      <th scope="col">
                        Record type
                      </th>
                      <th scope="col">
                        Record reference
                      </th>
                      <th scope="col">
                        Actor reference
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <time
                            dateTime={item.createdAt}
                          >
                            {timestamp.format(
                              new Date(
                                item.createdAt,
                              ),
                            )}
                          </time>
                        </td>

                        <td>{item.action}</td>

                        <td>
                          {item.entityType}
                        </td>

                        <td className="audit-reference">
                          {item.entityId ??
                            "No recorded reference"}
                        </td>

                        <td className="audit-reference">
                          {item.actorUserId ??
                            "No recorded actor"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="audit-pagination"
                aria-label="Audit history pagination"
              >
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() =>
                    navigate({
                      ...query,
                      page: data.page - 1,
                    })
                  }
                >
                  Previous
                </button>

                <span>
                  Page {data.page} of{" "}
                  {data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    data.page >=
                      data.totalPages ||
                    data.page >= 10000
                  }
                  onClick={() =>
                    navigate({
                      ...query,
                      page: data.page + 1,
                    })
                  }
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </>
  );
}

export default function AuditLogs() {
  const [params, setParams] =
    useSearchParams();

  const search = params.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseAuditQuery(search),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error:
          failure instanceof Error
            ? failure.message
            : "The audit URL is invalid.",
      };
    }
  }, [search]);

  const changeQuery = useCallback(
    (next, replace = false) => {
      setParams(
        auditSearch(next),
        { replace },
      );
    },
    [setParams],
  );

  return (
    <section className="audit-page">
      <p className="eyebrow">
        Administrator workspace
      </p>

      <h1>Audit Logs</h1>

      <p>
        This screen shows recorded audit
        events. It does not establish that
        every system action has been audited.
      </p>

      <p>
        Actor references identify recorded
        users. A missing actor does not
        necessarily mean the event was
        generated automatically.
      </p>

      {parsed.query ? (
        <AuditDirectory
          query={parsed.query}
          onChange={changeQuery}
        />
      ) : (
        <div className="feedback">
          <p role="alert">
            {parsed.error}
          </p>

          <button
            type="button"
            onClick={() =>
              setParams(
                "",
                { replace: true },
              )
            }
          >
            Clear invalid filters
          </button>
        </div>
      )}
    </section>
  );
}