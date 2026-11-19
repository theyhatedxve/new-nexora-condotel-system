import { RefreshCw } from "lucide-react";
import StaffDataState from "../StaffDataState";
import { useStaffData } from "../../hooks/useStaffData";
import { getDashboardSummary } from "../../services/dashboardApi";
import { timestamp, operationalCards } from "../../constants/reports.js";

export function CurrentOccupancy() {
  const state = useStaffData(getDashboardSummary);

  return (
    <section className="reports-section" aria-labelledby="occupancy-report-title">
      <div className="reports-heading">
        <div>
          <h2 id="occupancy-report-title">Current occupancy snapshot</h2>

          <p>
            Current snapshot. Financial report dates do not change these figures.
          </p>
        </div>

        <button
          type="button"
          className="reports-page__secondary"
          onClick={state.reload}
          disabled={state.loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh snapshot
        </button>
      </div>

      <StaffDataState state={state} label="the current occupancy snapshot" />

      {state.status === "ready" && (
        <>
          <p className="reports-page__timestamp">
            Philippine date: {state.data.date}. Updated{" "}
            {timestamp.format(new Date(state.data.asOf))} (Asia/Manila).
          </p>

          <div className="reports-page__metrics reports-compact__occupancy">
            {operationalCards.map(([key, title, description]) => (
              <article className="reports-page__metric" key={key}>
                <h3>{title}</h3>

                <p className="reports-page__value">
                  {state.data[key].toLocaleString("en-PH")}
                </p>

                <p className="reports-page__description">{description}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
