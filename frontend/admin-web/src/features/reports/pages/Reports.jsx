import useReportsPage from "../hooks/useReportsPage.js";
import { useAuth } from "../../auth/useAuth.js";
import { CurrentOccupancy } from "../components/CurrentOccupancy.jsx";
import { CollectionsReport } from "../components/CollectionsReport.jsx";
import { ReportFilters } from "../components/ReportFilters.jsx";
import DepositReport from "../components/DepositReport.jsx";
import FinancialExceptionReport from "../components/FinancialExceptionReport.jsx";
import ReportDialog from "../components/ReportDialog.jsx";

import "../styles/reports.css";
import "../../../shared/styles/admin-management.css";
import "../styles/reports-compact.css";

export default function Reports() {
  const { user } = useAuth();
  const { parsed, applyRange, resetRange } = useReportsPage();

  const query = parsed.query;
  const reportScope = query
    ? `${user?.id}:${user?.role}:${query.from}:${query.to}`
    : "";

  return (
    <section
      className="reports-page management-ui reports-compact"
      aria-labelledby="reports-title"
    >
      <header className="reports-page__heading">
        <h1 id="reports-title" className="management-ui__title">
          Reports
        </h1>
        <p>
          Review current operations and collections from authorized records.
        </p>
      </header>

      <section
        className="reports-section reports-compact__filters"
        aria-labelledby="financial-date-title"
      >
        <h2 id="financial-date-title">Financial report dates</h2>

        <p>
          Applies to collections, refunds, deposit movements, and notices
          first recorded in the selected period. Current occupancy is
          unaffected.
        </p>

        {query ? (
          <ReportFilters
            key={`${query.from}:${query.to}`}
            query={query}
            onApply={applyRange}
          />
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

      <CurrentOccupancy />

      {query && (
        <>
          <section
            className="reports-section"
            aria-labelledby="collections-report-title"
          >
            <header className="reports-page__section-heading">
              <h2 id="collections-report-title">
                Collections and refunds
              </h2>

              <p>
                Cash movement before provider fees. These totals do not
                represent earned revenue.
              </p>
            </header>

            <CollectionsReport query={query} />
          </section>

          <div
            className="reports-compact__details-grid"
            key={reportScope}
          >
            <ReportDialog
              title="Deposit movements"
              description="Review deposit totals, deductions, restorations, and actual cash returns."
              query={query}
            >
              <DepositReport query={query} />
            </ReportDialog>

            {user?.role === "SUPER_ADMIN" && (
              <ReportDialog
                title="Financial-exception notices"
                description="Inspect internal notices and open the existing reconciliation review."
                query={query}
              >
                <FinancialExceptionReport query={query} />
              </ReportDialog>
            )}
          </div>
        </>
      )}
    </section>
  );
}