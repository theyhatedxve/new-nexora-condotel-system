import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import StaffDataState from "../StaffDataState";
import { formatPesos, formatStatus, formatTimestamp } from "../../utils/formatters";
import { parsePropertyCollectionAmount } from "../../services/paymentsApi";
import { depositStaffRoles, depositManagerRoles } from "../../services/reservationDepositsApi";
import useReservationDeposits from "../../hooks/useReservationDeposits";

function Workspace({ user, reservationId, bookingStatus, onReload }) {
  const [reason, setReason] = useState("");
  const { history, page, setPage, draft, busy, message, blocked, heading,
    prepare, back, submit, setMessage } = useReservationDeposits(user.id, reservationId, onReload);
  const data = history.status === "ready" ? history.data : null;
  const manager = depositManagerRoles.includes(user.role);
  const locked = Boolean(draft) || busy || blocked;
  function review(action, fields, label) {
    if (reason.trim().length < 3) { setMessage("Enter a reason of at least 3 characters."); return; }
    prepare({ action, reason: reason.trim(), ...fields }, label + ". Reason: " + reason.trim());
  }
  function collect(event) {
    event.preventDefault();
    try {
      const amount = parsePropertyCollectionAmount(String(new FormData(event.currentTarget).get("amount") || ""));
      review("COLLECT", { amountCentavos: amount, moneyReceived: true }, "Record cash deposit " + formatPesos(amount));
    } catch { setMessage("Enter a valid positive deposit amount in PHP."); }
  }
  return (
    <section
      className="record-section"
      aria-labelledby="reservation-deposits-title"
      aria-busy={busy}
    >
      <h2 id="reservation-deposits-title">Optional security deposit</h2>
      <p>Deposits are held funds, separate from accommodation revenue. Approval of a return reserves money; it does not record a cash handover. Deductions settle an approved charge in full.</p>
      <button type="button" onClick={history.reload} disabled={history.loading}>Refresh deposit records</button>
      <StaffDataState state={history} label="Deposit records" />
      {message && <p role="status">{message}</p>}
      <label htmlFor="deposit-reason">Reason for the next deposit action</label>
      <textarea id="deposit-reason" value={reason} minLength={3} maxLength={500} onChange={(event) => setReason(event.target.value)} />
      {data && (
        <>
          <dl className="record-fields">
            <div><dt>Cash collected</dt><dd>{formatPesos(data.summary.collectedCentavos)}</dd></div>
            <div><dt>Net approved deductions</dt><dd>{formatPesos(data.summary.deductedCentavos)}</dd></div>
            <div><dt>Cash returned</dt><dd>{formatPesos(data.summary.returnedCentavos)}</dd></div>
            <div><dt>Deposit still held</dt><dd>{formatPesos(data.summary.balanceCentavos)}</dd></div>
            <div><dt>Reserved for approved returns</dt><dd>{formatPesos(data.summary.reservedReturnCentavos)}</dd></div>
            <div><dt>Available for deduction or return approval</dt><dd>{formatPesos(data.summary.availableCentavos)}</dd></div>
          </dl>
          <form onSubmit={collect} hidden={Boolean(draft)}>
            <fieldset className="action-fields" disabled={locked}>
              <legend>Record cash actually received</legend>
              <label htmlFor="deposit-amount">Amount, PHP</label>
              <input id="deposit-amount" name="amount" inputMode="decimal" required />
              <button type="submit">Review deposit receipt</button>
            </fieldset>
          </form>
          {manager && (
            <>
              <h3>Approved charges available for full deduction</h3>
              {data.eligibleCharges.map((charge) => (
                <p key={charge.id}>
                  {charge.description} — {formatPesos(charge.amountCentavos)}{" "}
                  <button type="button" disabled={locked || charge.amountCentavos > data.summary.availableCentavos}
                    onClick={() => review("DEDUCT", { chargeId: charge.id },
                      "Settle " + charge.description + " from deposit: " + formatPesos(charge.amountCentavos))}>
                    Review full deduction
                  </button>
                </p>
              ))}
              {["CHECKED_OUT", "CANCELLED", "EXPIRED"].includes(bookingStatus) && (
                <button type="button" disabled={locked || data.summary.availableCentavos <= 0}
                  onClick={() => review("AUTHORIZE_RETURN", { amountCentavos: data.summary.availableCentavos },
                    "Authorize remaining available cash return: " + formatPesos(data.summary.availableCentavos))}>
                  Review return authorization
                </button>
              )}
            </>
          )}
          <h3>Approved cash returns awaiting handover</h3>
          {data.pendingReturns.map((authorization) => (
            <p key={authorization.id}>
              {formatPesos(authorization.amountCentavos)} · Approved by {authorization.approvedBy.name} · {authorization.reason}{" "}
              <button type="button" disabled={locked}
                onClick={() => review("RETURN_CASH", { authorizationId: authorization.id, moneyReturned: true },
                  "Record actual cash returned: " + formatPesos(authorization.amountCentavos))}>
                Record actual cash return
              </button>
            </p>
          ))}
          {user.role === "SUPER_ADMIN" && (
            <>
              <h3>Unfulfilled deposit-funded extensions</h3>
              {data.restorableCharges.map((charge) => (
                <p key={charge.id}>
                  {charge.description} — {formatPesos(charge.amountCentavos)}{" "}
                  <button type="button" disabled={locked}
                    onClick={() => review("RESTORE_EXTENSION", { chargeId: charge.id },
                      "Restore held deposit for unfulfilled extension: " + formatPesos(charge.amountCentavos) +
                      ". No cash is returned by this action")}>
                    Review deposit restoration
                  </button>
                </p>
              ))}
            </>
          )}
          <p>Open-action lists show up to 20 records at a time. Completing records reveals the next available items.</p>
          <h3>Deposit movement history</h3>
          {!data.items.length && <p>No deposit movements on this page.</p>}
          <ol>{data.items.map((item) => (
            <li key={item.id}>
              <p><strong>{formatStatus(item.kind)}</strong> — {formatPesos(item.amountCentavos)}</p>
              <p>{item.reason}</p><p>{item.recordedBy.name} · {formatTimestamp(item.createdAt)}</p>
            </li>
          ))}</ol>
          <nav className="actions" aria-label="Deposit history pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} · {data.total} movements</span>
            <button type="button" disabled={page >= 10000 || page * 20 >= data.total} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
      {draft && (
        <section className="action-review" aria-label="Review deposit action">
          <h3 ref={heading} tabIndex={-1}>Review deposit action</h3>
          <p>{draft.label}</p><p>Request: {draft.command.requestId}</p>
          {draft.phase === "rejected" ? (
            <button type="button" onClick={back} disabled={busy}>Acknowledge rejection and start over</button>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              {["COLLECT", "RETURN_CASH"].includes(draft.command.action) && <label>
                <input type="checkbox" required />
                {draft.command.action === "COLLECT" ? "I have actually received the cash amount shown." : "I have actually returned the authorized cash amount."}
              </label>}
              <div className="actions">
                {draft.phase === "review" && <button type="button" onClick={back} disabled={busy}>Back</button>}
                <button type="submit" disabled={busy || blocked}>{busy ? "Saving…" : draft.phase === "pending" ? "Retry original request" : "Confirm deposit action"}</button>
              </div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}
export default function ReservationDeposits({ reservationId, bookingStatus, onReload }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !depositStaffRoles.includes(user?.role)) return null;
  return <Workspace key={user.id + ":" + reservationId + ":" + bookingStatus}
    user={user} reservationId={reservationId} bookingStatus={bookingStatus} onReload={onReload} />;
}
