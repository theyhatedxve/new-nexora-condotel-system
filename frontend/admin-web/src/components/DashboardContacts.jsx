import { Link } from "react-router";
import { formatTimestamp, guestName } from "../utils/formatters";

export default function DashboardContacts({ contacts }) {
  const ready = contacts.status === "ready";
  const items = ready ? contacts.data.items : [];
  return (
    <section className="dashboard-screen__panel" aria-labelledby="dashboard-contacts-title" aria-busy={contacts.loading}>
      <header className="dashboard-screen__section-heading">
        <div>
          <h2 id="dashboard-contacts-title">Guest contact queue</h2>
          <p className="dashboard-screen__muted">Pending Pay at Property requests, oldest first.</p>
        </div>
        <button type="button" className="dashboard-screen__refresh" disabled={contacts.loading} onClick={contacts.reload}>
          Refresh contact queue
        </button>
      </header>
      {contacts.loading && <p role="status" className="dashboard-screen__message">Loading contact requests…</p>}
      {!contacts.loading && !ready && (
        <p role="alert" className="dashboard-screen__message">
          {contacts.status === "denied" ? "Your current account cannot view this queue." : "The contact queue could not be loaded. Try refreshing it."}
        </p>
      )}
      {ready && items.length === 0 && (
        <p role="status" className="dashboard-screen__message">No pending Pay at Property requests need attention.</p>
      )}
      {ready && items.length > 0 && (
        <div className="dashboard-screen__table-scroll" role="region" aria-label="Guest contact queue" tabIndex={0}>
          <table className="dashboard-screen__table">
            <caption>Open a reservation to review its current state and record contact</caption>
            <thead><tr>
              <th scope="col">Reference</th><th scope="col">Guest</th><th scope="col">Attention</th>
              <th scope="col">Expected arrival</th><th scope="col">Recorded deadline</th>
            </tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                <th scope="row"><Link to={`/reservations/${encodeURIComponent(item.id)}`}>{item.reservationNumber}</Link></th>
                <td>{guestName(item.guest)}</td>
                <td>{item.attention === "INITIAL_CONTACT_NEEDED" ? "Initial contact needed" : "Awaiting confirmation"}</td>
                <td>{formatTimestamp(item.expectedArrivalAt)}</td>
                <td>{item.deadlineAt === null ? <span>Not recorded — staff review needed</span> : <>
                  <span>{formatTimestamp(item.deadlineAt)}</span>
                  {item.deadlineReached && <p>Deadline passed — check current reservation state</p>}
                </>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {ready && (
        <p className="dashboard-screen__updated">
          Showing {items.length} of {contacts.data.total} requests.
          {" "}As of {formatTimestamp(contacts.data.asOf)}, Philippine time.
          {" "}<Link to="/reservations">Open reservations</Link>
        </p>
      )}
      <p className="dashboard-screen__muted">
        Refresh to check current deadlines. Viewing this queue does not contact guests, confirm requests, or change their deadlines.
      </p>
    </section>
  );
}
