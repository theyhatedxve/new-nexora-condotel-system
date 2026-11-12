import useReportsPage from "../hooks/useReportsPage.js";
import { CurrentOccupancy } from "../components/reports/CurrentOccupancy.jsx";
import { CollectionsReport } from "../components/reports/CollectionsReport.jsx";
import "../styles/reports.css";

export default function Reports() {
  const { parsed, applyRange, resetRange } = useReportsPage();

  return (
    <section className="reports-page" aria-labelledby="reports-title">
      <header className="reports-page__heading">
        <h1 id="reports-title">Reports</h1>
        <p>Review current operations and collections from authorized records.</p>
      </header>

      <p className="reports-page__notice">
        All calendar dates and displayed timestamps use Philippine time
        (Asia/Manila). The financial date range applies only to collections and
        refunds.
      </p>

      <CurrentOccupancy />

      <section className="reports-section" aria-labelledby="collections-report-title">
        <header className="reports-page__section-heading">
          <h2 id="collections-report-title">Collections and refunds</h2>

          <p>
            Cash movement during the selected period, before provider fees.
            These totals do not represent earned revenue.
          </p>
        </header>

        {parsed.query ? (
          <CollectionsReport query={parsed.query} onApply={applyRange} />
        ) : (
          <div className="feedback">
            <p role="alert">{parsed.error}</p>

            <button
              type="button"
              className="reports-page__secondary"
              onClick={resetRange}
            >
              Use today
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
