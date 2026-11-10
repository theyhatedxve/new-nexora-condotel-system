import useAuditFilters from "../../hooks/useAuditFilters.js";

export function AuditFilters({ query, onApply, onClear }) {
  const { error, submit } = useAuditFilters({ query, onApply });

  return (
    <form className="audit-filters" onSubmit={submit}>
      <div className="audit-field">
        <label htmlFor="audit-from">From</label>

        <input
          id="audit-from"
          name="from"
          type="date"
          defaultValue={query.from}
          aria-describedby="audit-date-help"
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-to">To</label>

        <input
          id="audit-to"
          name="to"
          type="date"
          defaultValue={query.to}
          aria-describedby="audit-date-help"
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-action">Exact action</label>

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
        <label htmlFor="audit-entity-type">Exact record type</label>

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
        <button type="submit">Apply filters</button>

        <button type="button" onClick={onClear}>
          Clear filters
        </button>
      </div>

      <p id="audit-date-help" className="audit-filter-help">
        Leave both dates blank for all history, or provide both. Both selected dates are
        included using Philippine time.
      </p>

      <p id="audit-exact-help" className="audit-filter-help">
        Copy action and record type values from the table for exact filtering.
      </p>

      {error && (
        <p role="alert" className="audit-filter-help feedback">
          {error}
        </p>
      )}
    </form>
  );
}
