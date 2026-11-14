import useAuditLogsPage from "../hooks/useAuditLogsPage.js";
import { AuditDirectory } from "../components/audit/AuditDirectory.jsx";
import "../styles/audit-logs.css";

export default function AuditLogs() {
  const { parsed, changeQuery, clearFilters } = useAuditLogsPage();

  return (
    <section className="audit-page" aria-labelledby="audit-title">
      <header className="audit-page__heading">
        <h1 id="audit-title">Audit Logs</h1>
        <p>Review recorded system activity and administrative changes.</p>
      </header>

      <p className="audit-page__notice">
        Audit coverage depends on the events recorded by the backend. Actor
        references identify recorded users. Events with missing actor references
        have an unknown recorded actor.
      </p>

      {parsed.query ? (
        <AuditDirectory query={parsed.query} onChange={changeQuery} />
      ) : (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="audit-page__secondary"
            onClick={clearFilters}
          >
            Clear invalid filters
          </button>
        </div>
      )}
    </section>
  );
}
