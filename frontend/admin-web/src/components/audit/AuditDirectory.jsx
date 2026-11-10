import StaffDataState from "../StaffDataState";
import { auditSearch } from "../../services/auditApi";
import { timestamp } from "../../constants/auditLogs.js";
import useAuditDirectory from "../../hooks/useAuditDirectory.js";
import { AuditFilters } from "./AuditFilters.jsx";

export function AuditDirectory({ query, onChange }) {
  const {
    state,
    resultsRef,
    data,
    navigate,
    clearFilters,
    refresh,
    first,
    last,
    handleNavigate,
    previousPage,
    nextPage,
  } = useAuditDirectory({ query, onChange });

  return (
    <>
      <AuditFilters
        key={auditSearch(query)}
        query={query}
        onApply={navigate}
        onClear={clearFilters}
      />

      <div className="audit-toolbar">
        <button type="button" onClick={refresh} disabled={state.loading}>
          Refresh history
        </button>

        <div className="audit-page-size">
          <label htmlFor="audit-limit">Records per page</label>

          <select id="audit-limit" value={query.limit} onChange={handleNavigate}>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <StaffDataState state={state} label="audit history" />

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
                    Recorded audit events, newest first. Times use Asia/Manila.
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Action</th>
                      <th scope="col">Record type</th>
                      <th scope="col">Record reference</th>
                      <th scope="col">Actor reference</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <time dateTime={item.createdAt}>
                            {timestamp.format(new Date(item.createdAt))}
                          </time>
                        </td>

                        <td>{item.action}</td>

                        <td>{item.entityType}</td>

                        <td className="audit-reference">
                          {item.entityId ?? "No recorded reference"}
                        </td>

                        <td className="audit-reference">
                          {item.actorUserId ?? "No recorded actor"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="audit-pagination" aria-label="Audit history pagination">
                <button type="button" disabled={data.page <= 1} onClick={previousPage}>
                  Previous
                </button>

                <span>
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={data.page >= data.totalPages || data.page >= 10000}
                  onClick={nextPage}
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
