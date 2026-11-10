import useReportsPage from "../hooks/useReportsPage.js";
import { CurrentOccupancy } from "../components/reports/CurrentOccupancy.jsx";
import { CollectionsReport } from "../components/reports/CollectionsReport.jsx";
import "../styles/reports.css";

export default function Reports() {
  const { parsed, applyRange, resetRange } = useReportsPage();

  return (
    <section className="reports-page">
      <p className="eyebrow">Staff workspace</p>

      <h1>Reports</h1>

      <p>Reports use authorized backend records. All calendar dates use Asia/Manila.</p>

      <CurrentOccupancy />

      <section className="reports-section" aria-labelledby="collections-report-title">
        <h2 id="collections-report-title">Collections and refunds</h2>

        <p>
          Cash movement during the selected period, before provider fees. These totals do
          not represent earned revenue.
        </p>

        {parsed.query ? (
          <CollectionsReport query={parsed.query} onApply={applyRange} />
        ) : (
          <div className="feedback">
            <p role="alert">{parsed.error}</p>

            <button type="button" onClick={resetRange}>
              Use today
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
