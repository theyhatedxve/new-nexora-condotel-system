import { Search } from "lucide-react";
import useAuditFilters from "../../hooks/useAuditFilters.js";

export function AuditFilters({ query, onApply, onClear }) {
  const { error, submit } = useAuditFilters({ query, onApply });

  const dateHelp = error
    ? "audit-date-help audit-filter-error"
    : "audit-date-help";

  const exactHelp = error
    ? "audit-exact-help audit-filter-error"
    : "audit-exact-help";

  return (
    <form
      className="audit-filters"
      onSubmit={submit}
      aria-label="Filter audit history"
    >
      <div className="audit-field">
        <label htmlFor="audit-from">From</label>

        <input
          id="audit-from"
          name="from"
          type="date"
          defaultValue={query.from}
          aria-describedby={dateHelp}
        />
      </div>

      <div className="audit-field">
        <label htmlFor="audit-to">To</label>

        <input
          id="audit-to"
          name="to"
          type="date"
          defaultValue={query.to}
          aria-describedby={dateHelp}
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
          aria-describedby={exactHelp}
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
          aria-describedby={exactHelp}
        />
      </div>

      <div className="audit-filter-actions">
        <button type="submit" className="audit-page__primary">
          <Search size={16} aria-hidden="true" />
          Apply filters
        </button>

        <button
          type="button"
          className="audit-page__secondary"
          onClick={onClear}
        >
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
        <p
          id="audit-filter-error"
          role="alert"
          className="audit-filter-help audit-page__error"
        >
          {error}
        </p>
      )}
    </form>
  );
}
