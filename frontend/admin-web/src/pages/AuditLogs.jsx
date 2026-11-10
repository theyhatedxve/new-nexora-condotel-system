import useAuditLogsPage from "../hooks/useAuditLogsPage.js";
import { AuditDirectory } from "../components/audit/AuditDirectory.jsx";
import "../styles/audit-logs.css";

export default function AuditLogs() {
  const { parsed, changeQuery, clearFilters } = useAuditLogsPage();

  return (
    <section className="audit-page">
      <p className="eyebrow">Administrator workspace</p>

      <h1>Audit Logs</h1>

      <p>
        This screen shows recorded audit events. It does not establish that every system
        action has been audited.
      </p>

      <p>
        Actor references identify recorded users. A missing actor does not necessarily
        mean the event was generated automatically.
      </p>

      {parsed.query ? (
        <AuditDirectory query={parsed.query} onChange={changeQuery} />
      ) : (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
            Clear invalid filters
          </button>
        </div>
      )}
    </section>
  );
}
