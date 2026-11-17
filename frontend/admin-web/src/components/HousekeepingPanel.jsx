import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useStaffData } from "../hooks/useStaffData";
import StaffDataState from "./StaffDataState";
import { housekeepingRoles, getHousekeepingHistory, updateHousekeeping } from "../services/housekeepingApi";
import { formatStatus, formatTimestamp } from "../utils/formatters";

function Workspace({ user, room, onReload }) {
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const history = useStaffData(getHousekeepingHistory, JSON.stringify([user.id, room.id, page]));
  const next = room.status === "CLEANING" ? "READY" : room.status === "READY" ? "CLEANING" : null;
  async function confirm() {
    if (!review || busy || unknown) return;
    setBusy(true);
    try {
      await updateHousekeeping(user.id, room.id, review.from, review.to);
      onReload();
    } catch { setUnknown(true); }
    finally { setBusy(false); }
  }
  return (
    <section className="record-section" aria-labelledby="housekeeping-title">
      <h2 id="housekeeping-title">Housekeeping and room-status history</h2>
      <p>Cleaning completion records physical readiness. A READY room can still be unavailable because of reservations or dated blocks.</p>
      <button type="button" onClick={onReload} disabled={busy}>Reload room and history</button>
      {next && !review && (
        <button type="button" onClick={() => setReview({ from: room.status, to: next })}>
          {next === "READY" ? "Review cleaning completion" : "Review start of cleaning"}
        </button>
      )}
      {review && (
        <section className="action-review" aria-label="Confirm housekeeping">
          <h3>Confirm room-status change</h3>
          <p>{formatStatus(review.from)} → {formatStatus(review.to)}</p>
          {unknown ? <p role="alert">Outcome unconfirmed or the room changed. Reload the room before making another request.</p> : (
            <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
              <label><input type="checkbox" required />
                {review.to === "READY" ? "Cleaning is complete and I have checked the room." : "I am recording the start of cleaning."}
              </label>
              <div className="actions">
                <button type="button" onClick={() => setReview(null)} disabled={busy}>Back</button>
                <button type="submit" disabled={busy}>{busy ? "Saving…" : "Confirm change"}</button>
              </div>
            </form>
          )}
        </section>
      )}
      <StaffDataState state={history} label="Room-status history" />
      {history.status === "ready" && (
        <>
          {!history.data.items.length && <p>No recorded changes on this page.</p>}
          <p>Earlier room-status changes may not have recorded history.</p>
          <ol>{history.data.items.map((item) => (
            <li key={item.id}>
              <p>{formatStatus(item.from)} → {formatStatus(item.to)} · {formatStatus(item.source)}</p>
              <p>{item.staffName} · {formatTimestamp(item.changedAt)}</p>
            </li>
          ))}</ol>
          <nav className="actions" aria-label="Room-status history pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" disabled={page >= 10000 || page * 20 >= history.data.total} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
    </section>
  );
}
export default function HousekeepingPanel({ room, onReload }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !housekeepingRoles.includes(user?.role)) return null;
  return <Workspace key={user.id + ":" + room.id + ":" + room.status} user={user} room={room} onReload={onReload} />;
}
