import { reportToday } from "../../services/reportsApi";
import useReportFilters from "../../hooks/useReportFilters.js";

export function ReportFilters({ query, onApply }) {
  const { error, submit } = useReportFilters({ onApply });

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
          aria-describedby="report-range-help"
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
          aria-describedby="report-range-help"
        />
      </div>

      <button type="submit">Apply dates</button>

      <p id="report-range-help" className="reports-filter-help">
        Select up to 31 calendar days. Both dates are included and use Philippine time.
      </p>

      {error && (
        <p role="alert" className="reports-filter-help feedback">
          {error}
        </p>
      )}
    </form>
  );
}
