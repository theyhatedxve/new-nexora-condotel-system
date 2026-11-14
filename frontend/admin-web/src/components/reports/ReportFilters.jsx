import { CalendarDays } from "lucide-react";
import { reportToday } from "../../services/reportsApi";
import useReportFilters from "../../hooks/useReportFilters.js";

export function ReportFilters({ query, onApply }) {
  const { error, submit } = useReportFilters({ onApply });

  const helpIds = error
    ? "report-range-help report-range-error"
    : "report-range-help";

  return (
    <form className="reports-filters" onSubmit={submit}>
      <div className="reports-date-field">
        <label htmlFor="report-from">From</label>

        <input
          id="report-from"
          name="from"
          type="date"
          required
          defaultValue={query.from}
          max={reportToday()}
          aria-describedby={helpIds}
        />
      </div>

      <div className="reports-date-field">
        <label htmlFor="report-to">To</label>

        <input
          id="report-to"
          name="to"
          type="date"
          required
          defaultValue={query.to}
          max={reportToday()}
          aria-describedby={helpIds}
        />
      </div>

      <button type="submit" className="reports-page__primary">
        <CalendarDays size={16} aria-hidden="true" />
        Apply dates
      </button>

      <p id="report-range-help" className="reports-filter-help">
        Select up to 31 calendar days. Both dates are included and use Philippine
        time. This range affects collections and refunds only.
      </p>

      {error && (
        <p
          id="report-range-error"
          role="alert"
          className="reports-filter-help reports-page__error"
        >
          {error}
        </p>
      )}
    </form>
  );
}
