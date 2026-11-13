import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
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

      <section
        className="audit-page__results"
        aria-labelledby="audit-history-title"
      >
        <div className="audit-toolbar">
          <h2 id="audit-history-title">Recorded history</h2>

          <button
            type="button"
            className="audit-page__secondary"
            onClick={refresh}
            disabled={state.loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh history
          </button>

          <div className="audit-page-size">
            <label htmlFor="audit-limit">Records per page</label>

            <select
              id="audit-limit"
              value={query.limit}
              onChange={handleNavigate}
            >
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
                      Recorded audit events, newest first. Times use
                      Asia/Manila.
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
                          <td className="audit-page__timestamp">
                            <time dateTime={item.createdAt}>
                              {timestamp.format(new Date(item.createdAt))}
                            </time>
                          </td>

                          <td>
                            <span className="audit-page__action">
                              {item.action}
                            </span>
                          </td>

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

                <nav
                  className="audit-pagination"
                  aria-label="Audit history pagination"
                >
                  <button
                    type="button"
                    className="audit-page__secondary"
                    disabled={data.page <= 1}
                    onClick={previousPage}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Previous
                  </button>

                  <span className="audit-page__page-number">
                    Page {data.page} of {data.totalPages}
                  </span>

                  <button
                    type="button"
                    className="audit-page__secondary"
                    disabled={
                      data.page >= data.totalPages || data.page >= 10000
                    }
                    onClick={nextPage}
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
