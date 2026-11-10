import SummaryCard from "../SummaryCard";
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
            These figures describe the current state. The financial date filters below do
            not change this snapshot.
          </p>
        </div>

        <button type="button" onClick={state.reload} disabled={state.loading}>
          Refresh snapshot
        </button>
      </div>

      <StaffDataState state={state} label="the current occupancy snapshot" />

      {state.status === "ready" && (
        <>
          <p>
            Philippine date: {state.data.date}. Updated{" "}
            {timestamp.format(new Date(state.data.asOf))}.
          </p>

          <div className="summary-grid">
            {operationalCards.map(([key, title, description]) => (
              <SummaryCard
                key={key}
                title={title}
                value={state.data[key].toLocaleString("en-PH")}
                description={description}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
