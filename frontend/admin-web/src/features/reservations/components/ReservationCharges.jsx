import { useAuth } from "../../auth/useAuth.js";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { formatPesos, formatStatus, formatTimestamp } from "../../../shared/utils/formatters.js";
import { chargeManagerRoles, chargeStaffRoles } from "../services/reservationChargesApi.js";
import useReservationChargeForm from "../hooks/useReservationChargeForm.js";

function Workspace({ user, reservationId, bookingStatus, onReload }) {
  const {
    history, page, setPage, draft, busy, message, blocked, heading,
    back, submit, kind, setKind, reason, setReason, propose, action,
  } = useReservationChargeForm({ actorId: user.id, reservationId, onReload });
  const manager = chargeManagerRoles.includes(user.role);

  return (
    <section
      className="record-section charges-workspace"
      aria-labelledby="reservation-charges-title"
      aria-busy={busy}
    >
      <h2 id="reservation-charges-title">Additional charges</h2>
      <p>
        Additional charges are separate from accommodation payments.
      </p>

      <details className="workspace-details">
        <summary>Cash receipts and late-checkout rules</summary>

        <div className="workspace-details__body">
          <p>
            This prototype records full cash receipts at the property.
            It does not charge a card or PayMongo account.
          </p>

          <p>
            Late checkout uses one 30-minute grace period per stay,
            then each started hour. Repeated extensions do not restart
            grace or charge prepaid hours twice.
          </p>
        </div>
      </details>
      <button type="button" onClick={history.reload} disabled={history.loading}>
        Refresh charges
      </button>
      <StaffDataState state={history} label="Additional charges" />
      {message && <p role="status">{message}</p>}
      {history.status === "ready" && (
        <>
          {!history.data.items.length && <p>No additional charges on this page.</p>}
          <ol>{history.data.items.map((item) => (
            <li key={item.id}>
              <h3>{formatStatus(item.kind)} — {formatPesos(item.amountCentavos)} — {formatStatus(item.status)}</h3>
              <p>{item.description}</p>
              {item.evidenceNotes && <p>Evidence notes: {item.evidenceNotes}</p>}
              <p>Recorded by {item.proposedBy.name} · {formatTimestamp(item.createdAt)}</p>
              {item.reviewedBy && <p>Reviewed by {item.reviewedBy.name} · {formatTimestamp(item.reviewedAt)}</p>}
              {item.requestedDepartureAt && <p>Proposed departure: {formatTimestamp(item.requestedDepartureAt)} · Additional billable hours: {item.billableHours} · Hourly rate: {formatPesos(item.hourlyRateCentavos)}</p>}
              {item.kind === "LATE_CHECKOUT" && <p>{item.appliedAt ? "Extension applied: " + formatTimestamp(item.appliedAt) : "Extension has not been applied."}</p>}
              {item.receipt ? (
                <>
                  <p>{item.receipt.source === "DEPOSIT" ? "Deposit settlement: " : "Cash receipt: "}{formatPesos(item.receipt.amountCentavos)} · {item.receipt.collectedBy.name} · {formatTimestamp(item.receipt.collectedAt)}</p>
                  {item.receipt.correctionRequired && !item.receipt.refundedAt && <p role="alert">Payment recorded; extension requires review. Do not collect again.</p>}
                  {item.receipt.refundedAt && <p>{item.receipt.source === "DEPOSIT" ? "Deposit restored: " : "Full cash correction recorded: "}{formatTimestamp(item.receipt.refundedAt)} · {item.receipt.refundReason}</p>}
                </>
              ) : <p>{item.amountCentavos === 0 ? "No cash payment required." : "No additional-charge cash receipt recorded."}</p>}
              <div className="actions">
                {manager && item.status === "PENDING" && <button type="button" disabled={Boolean(draft) || blocked} onClick={() => action("APPROVE", item)}>Review approval</button>}
                {manager && ["PENDING", "APPROVED"].includes(item.status) && !item.receipt && !item.appliedAt && <button type="button" disabled={Boolean(draft) || blocked} onClick={() => action("REJECT", item)}>Review rejection</button>}
                {item.status === "APPROVED" && item.amountCentavos > 0 && !item.receipt && <button type="button" disabled={Boolean(draft) || blocked} onClick={() => action("COLLECT", item)}>Record full cash receipt</button>}
                {manager && item.kind === "LATE_CHECKOUT" && item.status === "APPROVED" && !item.appliedAt && (item.amountCentavos === 0 || (item.receipt && !item.receipt.refundedAt)) && <button type="button" disabled={Boolean(draft) || blocked} onClick={() => action("APPLY_EXTENSION", item)}>Review extension application</button>}
                {user.role === "SUPER_ADMIN" && item.receipt?.source === "CASH" && item.status === "APPROVED" && !item.appliedAt && item.receipt?.correctionRequired && !item.receipt.refundedAt && <button type="button" disabled={Boolean(draft) || blocked} onClick={() => action("REFUND_UNFULFILLED_EXTENSION", item)}>Record actual cash correction</button>}
              </div>
            </li>
          ))}</ol>
          <nav className="actions" aria-label="Additional charge pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} · {history.data.total} charges</span>
            <button type="button" disabled={page >= 10000 || page * 20 >= history.data.total} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
      <div className="workspace-field charges-workspace__reason">
        <label htmlFor="charge-decision-reason">Reason for rejection or cash correction</label>
        <textarea id="charge-decision-reason" rows={3} value={reason} maxLength={500}
          disabled={busy || blocked || Boolean(draft)}
          aria-describedby="charge-decision-reason-help"
          onChange={(event) => setReason(event.target.value)} />
        <p id="charge-decision-reason-help">
          Required for rejection or cash correction. Enter at least 3 characters.
        </p>
      </div>
      {["CHECKED_IN", "CHECKED_OUT"].includes(bookingStatus) && (
        <form onSubmit={propose} hidden={Boolean(draft)}>
          <fieldset className="action-fields" disabled={busy || blocked || Boolean(draft)}>
            <legend>Propose an additional charge</legend>
            <label htmlFor="charge-kind">Charge type</label>
            <select id="charge-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="DAMAGE">Damage</option>
              {bookingStatus === "CHECKED_IN" && <option value="LATE_CHECKOUT">Late checkout</option>}
            </select>
            {kind === "DAMAGE" ? <>
              <label htmlFor="damage-description">Damage description</label><textarea id="damage-description" name="description" minLength={3} maxLength={500} required />
              <label htmlFor="damage-evidence">Evidence notes or reference (no sensitive personal data)</label><textarea id="damage-evidence" name="evidence" maxLength={1000} />
              <label htmlFor="damage-amount">Proposed amount, PHP</label><input id="damage-amount" name="amount" inputMode="decimal" required />
            </> : <>
              <label htmlFor="charge-departure">Proposed departure, Philippine time</label><input id="charge-departure" name="departure" type="datetime-local" step="60" required />
            </>}
            <button type="submit">Review proposal</button>
          </fieldset>
        </form>
      )}
      {draft && (
        <section className="action-review" aria-label="Review charge action">
          <h3 ref={heading} tabIndex={-1}>Review charge action</h3>
          <p>{draft.label}</p><p>Request: {draft.command.requestId}</p>
          {draft.phase === "rejected" ? <button type="button" onClick={back} disabled={busy}>Acknowledge rejection and start over</button> : (
            <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              {["COLLECT", "REFUND_UNFULFILLED_EXTENSION"].includes(draft.command.action) && <label className="action-checkbox">
                <input type="checkbox" required />
                <span>{draft.command.action === "COLLECT" ? "I have received the full cash amount shown above. Recording it does not grant an extension." : "I have actually returned the full cash amount for this unfulfilled extension."}</span>
              </label>}
              <div className="actions">
                {draft.phase === "review" && <button type="button" onClick={back} disabled={busy}>Back</button>}
                <button type="submit" disabled={busy || blocked}>{busy ? "Saving…" : draft.phase === "pending" ? "Retry original request" : "Confirm action"}</button>
              </div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}
export default function ReservationCharges({ reservationId, bookingStatus, onReload }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !chargeStaffRoles.includes(user?.role)) return null;
  return <Workspace key={user.id + ":" + reservationId + ":" + bookingStatus}
    user={user} reservationId={reservationId} bookingStatus={bookingStatus} onReload={onReload} />;
}
