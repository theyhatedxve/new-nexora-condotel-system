import { useState } from "react";
import { useAuth } from "../../auth/useAuth.js";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { getStayOperations, stayStaffRoles } from "../services/stayOperationsApi.js";
import { formatStatus, formatTimestamp } from "../../../shared/utils/formatters.js";

const messages = {
  NOT_APPLICABLE: "Only a checked-in stay can be considered for an extension.",
  TIMING_REVIEW: "A precise departure time requires staff review.",
  INVALID_EXTENSION: "Choose a time after both the current departure and the time of this check.",
  HOURLY_CLOSING_LIMIT: "Hourly stays must finish by 11 PM Philippine time.",
  INVENTORY_REVIEW_REQUIRED: "Room inventory or readiness prevents a safe eligibility result. Staff review is required.",
  AVAILABLE_FOR_REVIEW: "Inventory is available for this proposal at the time checked. No extension or charge approval has been granted.",
};

function Workspace({ actorId, reservationId }) {
  const [requested, setRequested] = useState(null);
  const [proposal, setProposal] = useState("");
  const [error, setError] = useState("");
  const state = useStaffData(
    getStayOperations, JSON.stringify([actorId, reservationId, requested]),
  );
  const data = state.status === "ready" ? state.data : null;

  function check(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("departure") || "");
    const at = new Date(value + ":00+08:00");
    if (!Number.isFinite(at.getTime())) {
      setError("Choose a valid Philippine departure date and time.");
      return;
    }
    setError("");
    setRequested(at.toISOString());
    state.reload();
  }

  return (
    <section 
      className="record-section stay-workspace"
      aria-labelledby="stay-operations-title"
      aria-busy={state.loading}
    >
      <h2 id="stay-operations-title">Stay operations</h2>
      <p>
        Guidance only. The 30-minute grace period does not override another booking
        or room block. Paid extensions require a separate approval and charge workflow.
      </p>
      <button type="button" onClick={state.reload} disabled={state.loading}>
        Refresh stay guidance
      </button>
      <StaffDataState state={state} label="Stay guidance" />
      {data && (
        <>
                    <dl className="workspace-facts">
            <div>
              <dt>Room readiness</dt>
              <dd>
                {data.roomStatus
                  ? formatStatus(data.roomStatus)
                  : "No single active assignment"}
              </dd>
            </div>

            <div>
              <dt>Reservation status</dt>
              <dd>{formatStatus(data.status)}</dd>
            </div>

            <div className="workspace-facts__priority">
              <dt>Applicable departure</dt>
              <dd>
                {data.effectiveDepartureAt
                  ? formatTimestamp(data.effectiveDepartureAt)
                  : "No precise checkout clock recorded"}
              </dd>
            </div>

            <div className="workspace-facts__priority">
              <dt>Original grace deadline</dt>
              <dd>
                {data.graceEndsAt
                  ? formatTimestamp(data.graceEndsAt)
                  : "Timing review required"}
              </dd>
            </div>

            <div>
              <dt>Checkout phase</dt>
              <dd>{formatStatus(data.phase)}</dd>
            </div>

            {data.paidBillingThroughAt && (
              <div>
                <dt>Billing coverage through</dt>
                <dd>
                  {formatTimestamp(data.paidBillingThroughAt)}
                  <small>
                    Pricing only. This does not extend room rights.
                  </small>
                </dd>
              </div>
            )}
          </dl>

          <details className="workspace-details">
            <summary>Actual stay timestamps and snapshot</summary>

            <div className="workspace-details__body">
              <dl className="workspace-facts">
                <div>
                  <dt>Actual arrival</dt>
                  <dd>{formatTimestamp(data.actualArrivalAt)}</dd>
                </div>

                <div>
                  <dt>Actual departure</dt>
                  <dd>{formatTimestamp(data.actualDepartureAt)}</dd>
                </div>

                <div>
                  <dt>Guidance checked at</dt>
                  <dd>{formatTimestamp(data.checkedAt)}</dd>
                </div>
              </dl>
            </div>
          </details>
          {data.requestedDepartureAt && (
            <div role="status">
              <p>Proposal checked: {formatTimestamp(data.requestedDepartureAt)}</p>
              <p>{messages[data.availability]}</p>
            </div>
          )}
          {data.status === "CHECKED_IN" && data.effectiveDepartureAt && (
            <form onSubmit={check}>
              <fieldset className="action-fields">
                <legend>Check late-checkout inventory only</legend>
                <label htmlFor="late-checkout-proposal">Proposed departure, Philippine time</label>
                <input id="late-checkout-proposal" name="departure" type="datetime-local" step="60" value={proposal} onChange={(event) => setProposal(event.target.value)} required />
                <button type="submit">Check proposal</button>
              </fieldset>
            </form>
          )}
          <p>These results are a snapshot. Staff must recheck inventory when approving an extension.</p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default function StayOperations({ reservationId, bookingStatus }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !stayStaffRoles.includes(user?.role)) return null;
  return <Workspace key={user.id + ":" + reservationId + ":" + bookingStatus}
    actorId={user.id} reservationId={reservationId} />;
}
