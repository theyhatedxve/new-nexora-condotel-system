import SummaryCard from "../SummaryCard";
import StaffDataState from "../StaffDataState";
import { money, timestamp, financialCards } from "../../constants/reports.js";
import useCollectionsReport from "../../hooks/useCollectionsReport.js";
import { ReportFilters } from "./ReportFilters.jsx";

export function CollectionsReport({ query, onApply }) {
  const { state, data } = useCollectionsReport({ query });

  return (
    <>
      <ReportFilters key={`${query.from}:${query.to}`} query={query} onApply={onApply} />

      <div className="reports-heading">
        <p>
          Applied range:{" "}
          <strong>
            {query.from} through {query.to}
          </strong>{" "}
          ({query.days} {query.days === 1 ? "day" : "days"}).
        </p>

        <button type="button" onClick={state.reload} disabled={state.loading}>
          Refresh collections
        </button>
      </div>

      <StaffDataState state={state} label="the collections report" />

      {data && (
        <>
          <p>Calculated {timestamp.format(new Date(data.asOf))} (Asia/Manila).</p>

          {data.status === "REVIEW_REQUIRED" ? (
            <div className="feedback" role="alert">
              <h3>Review required</h3>

              <p>
                Relevant financial records require review. Totals are unavailable and must
                not be interpreted as zero.
              </p>
            </div>
          ) : (
            <>
              <div className="summary-grid">
                {financialCards.map(([key, title, description]) => (
                  <SummaryCard
                    key={key}
                    title={title}
                    value={money.format(data[key] / 100)}
                    description={description}
                  />
                ))}
              </div>

              {data.collectionsCentavos === 0 && data.refundsCentavos === 0 && (
                <p role="status">No completed collections or refunds match this range.</p>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
