import { RefreshCw } from "lucide-react";
import StaffDataState from "../StaffDataState";
import { money, timestamp, financialCards } from "../../constants/reports.js";
import useCollectionsReport from "../../hooks/useCollectionsReport.js";
import { ReportFilters } from "./ReportFilters.jsx";

export function CollectionsReport({ query, onApply }) {
  const { state, data } = useCollectionsReport({ query });

  return (
    <>
      <ReportFilters key={`${query.from}:${query.to}`} query={query} onApply={onApply} />

      <div className="reports-heading reports-page__applied-range">
        <p>
          <span className="reports-page__range-label">Applied range</span>
          <strong>
            {query.from} through {query.to}
          </strong>

          <span>
            {" "}
            ({query.days} {query.days === 1 ? "day" : "days"}, inclusive).
          </span>
        </p>

        <button
          type="button"
          className="reports-page__secondary"
          onClick={state.reload}
          disabled={state.loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh collections
        </button>
      </div>

      <StaffDataState state={state} label="the collections report" />

      {data && (
        <>
          <p className="reports-page__timestamp">
            Calculated {timestamp.format(new Date(data.asOf))} (Asia/Manila).
          </p>

          {data.status === "REVIEW_REQUIRED" ? (
            <div className="reports-page__review" role="alert">
              <h3>Review required</h3>

              <p>
                Relevant financial records require review. Totals are unavailable and must
                not be interpreted as zero.
              </p>
            </div>
          ) : (
            <>
              <div className="reports-page__metrics reports-page__financial">
                {financialCards.map(([key, title, description]) => (
                  <article className="reports-page__metric" key={key}>
                    <h3>{title}</h3>

                    <p className="reports-page__value">
                      {money.format(data[key] / 100)}
                    </p>

                    <p className="reports-page__description">{description}</p>
                  </article>
                ))}
              </div>

              {data.collectionsCentavos === 0 && data.refundsCentavos === 0 && (
                <p className="reports-page__empty" role="status">
                  No completed collections or refunds match this range.
                </p>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
