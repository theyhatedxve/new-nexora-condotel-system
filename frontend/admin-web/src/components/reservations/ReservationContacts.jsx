import { useAuth } from "../../auth/useAuth";
import StaffDataState from "../StaffDataState";
import { formatStatus, formatTimestamp } from "../../utils/formatters";
import { contactPurposes, contactResults, contactRoles } from "../../services/reservationContactsApi";
import useReservationContacts from "../../hooks/useReservationContacts";

function ContactWorkspace({ actorId, reservationId, bookingStatus }) {
  const {
    history, page, setPage, intent, busy, message, error,
    heading, reviewHeading, prepare, submit, back,
  } = useReservationContacts(actorId, reservationId);
  const canRecord = ["PENDING", "CONFIRMED"].includes(bookingStatus);
  const draft = intent?.draft;

  return (
    <section
      className="record-section contacts-workspace"
      aria-labelledby="contact-history-title"
      aria-busy={busy}
    >
      <h2 id="contact-history-title" ref={heading} tabIndex={-1}>Guest follow-up</h2>
      <p>
        Record completed contact attempts. First contact and booking confirmation
        still use the existing guest-request controls.
      </p>
      <p className="workspace-notice">
        Arrival estimates are informational. They do not change booking deadlines,
        no-show cutoffs, or reserved stay times.
      </p>
      <StaffDataState state={history} label="Contact history" />
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {canRecord && (
        <form onSubmit={prepare} hidden={Boolean(intent)}>
          <fieldset className="action-fields" disabled={busy || Boolean(error) || Boolean(intent)}>
            <legend>Record a completed contact attempt</legend>
            <div className="workspace-form-grid">
              <div className="workspace-field">
                <label htmlFor="contact-channel">Channel</label>
                <select id="contact-channel" name="channel" required>
                  <option value="PHONE">Phone</option><option value="EMAIL">Email</option>
                </select>
              </div>
              <div className="workspace-field">
                <label htmlFor="contact-purpose">Purpose</label>
                <select id="contact-purpose" name="purpose" required>
                  {contactPurposes.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}
                </select>
              </div>
              <div className="workspace-field">
                <label htmlFor="contact-result">Outcome</label>
                <select id="contact-result" name="result" required defaultValue="">
                  <option value="" disabled>Choose the actual outcome</option>
                  {contactResults.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}
                </select>
              </div>
              <div className="workspace-field">
                <label htmlFor="contact-estimate">Reported arrival, Philippine time (optional)</label>
                <input id="contact-estimate" name="estimate" type="datetime-local" step="60" />
              </div>
              <div className="workspace-field workspace-field--full">
                <label htmlFor="contact-notes">Notes (optional, maximum 500 characters)</label>
                <textarea id="contact-notes" name="notes" rows={3} maxLength={500} aria-describedby="contact-notes-help" />
                <p id="contact-notes-help">Use factual notes. Do not enter passwords, payment card details, or identity document numbers.</p>
              </div>
            </div>
            <button type="submit">Review contact record</button>
          </fieldset>
        </form>
      )}
      {intent && (
        <section className="action-review" aria-label="Review contact record">
          <h3 ref={reviewHeading} tabIndex={-1}>Review contact record</h3>
          <p>{formatStatus(draft.channel)} · {formatStatus(draft.purpose)} · {formatStatus(draft.result)}</p>
          <p>Reported arrival: {draft.expectedArrivalAt ? formatTimestamp(draft.expectedArrivalAt) : "Not supplied"}</p>
          <p>Notes: {draft.notes || "None"}</p>
          <p>Request reference: {draft.requestId}</p>
          {intent.submitted && <p>This request is retained for recovery. Retry it without changing the details.</p>}
          <div className="actions">
            {!intent.submitted && <button type="button" onClick={back} disabled={busy}>Back</button>}
            <button type="button" onClick={() => void submit()} disabled={busy || Boolean(error)}>
              {busy ? "Saving contact…" : intent.submitted ? "Retry original contact request" : "Confirm contact record"}
            </button>
          </div>
        </section>
      )}
      {!canRecord && !intent && <p>This booking is read-only for new arrival follow-ups.</p>}
      <details className="workspace-details">
        <summary>
          Contact history
          {history.status === "ready" ? ` · ${history.data.total} records` : ""}
        </summary>
        <div className="workspace-details__body">
          <button type="button" onClick={history.reload} disabled={history.loading}>
            Refresh contact history
          </button>
          {history.status === "ready" && (
            <>
              {history.data.items.length === 0 && <p>No contact records on this page.</p>}
              <ol className="workspace-history">
                {history.data.items.map((item) => (
                  <li key={item.id}>
                    <p><strong>{formatStatus(item.purpose)}</strong> — {formatTimestamp(item.contactedAt)}</p>
                    <p>{item.staffName} · {formatStatus(item.channel)} · {formatStatus(item.result)}</p>
                    {item.historical && <p>Historical contact: outcome and arrival estimate were not recorded.</p>}
                    {item.expectedArrivalAt && <p>Reported arrival: {formatTimestamp(item.expectedArrivalAt)}</p>}
                    {item.notes && <p>{item.notes}</p>}
                  </li>
                ))}
              </ol>
              <nav className="actions" aria-label="Contact history pages">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page} · {history.data.total} records</span>
                <button type="button" disabled={page >= 10000 || page * 20 >= history.data.total}
                  onClick={() => setPage(page + 1)}>Next</button>
              </nav>
            </>
          )}
        </div>
      </details>
    </section>
  );
}

export default function ReservationContacts({ reservationId, bookingStatus }) {
  const { status, user } = useAuth();
  if (status !== "authenticated" || !contactRoles.includes(user?.role)) return null;
  return <ContactWorkspace key={user.id + ":" + reservationId}
    actorId={user.id} reservationId={reservationId} bookingStatus={bookingStatus} />;
}
