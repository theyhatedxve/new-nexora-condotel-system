import { Link } from "react-router";
import { formatPesos, formatTimestamp } from "../utils/formatters";

function AttentionQueue({ title, queue, caption }) {
  if (queue === null) return null;
  return (
    <section>
      <h3>{title}: {queue.total}</h3>
      {queue.items.length === 0 ? <p>No records currently need attention.</p> : (
        <div className="dashboard-screen__table-scroll" role="region" aria-label={title} tabIndex={0}>
          <table className="dashboard-screen__table">
            <caption>{caption}</caption>
            <thead><tr>
              <th scope="col">Reservation</th><th scope="col">Item</th>
              <th scope="col">Amount</th><th scope="col">Recorded</th>
            </tr></thead>
            <tbody>{queue.items.map((item) => (
              <tr key={item.id}>
                <th scope="row"><Link to={`/reservations/${encodeURIComponent(item.reservationId)}`}>{item.reservationNumber}</Link></th>
                <td>{item.label}</td><td>{formatPesos(item.amountCentavos)}</td>
                <td>{formatTimestamp(item.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="dashboard-screen__muted">Showing {queue.items.length} of {queue.total}, oldest first.</p>
    </section>
  );
}

export default function DashboardAttention({ attention }) {
  const ready = attention.status === "ready";
  const data = ready ? attention.data : null;
  return (
    <section className="dashboard-screen__panel" aria-labelledby="dashboard-attention-title" aria-busy={attention.loading}>
      <header className="dashboard-screen__section-heading">
        <div>
          <h2 id="dashboard-attention-title">Financial and charge attention</h2>
          <p className="dashboard-screen__muted">Open a reservation to review the current record and available actions.</p>
        </div>
        <button type="button" className="dashboard-screen__refresh" disabled={attention.loading} onClick={attention.reload}>
          Refresh attention queues
        </button>
      </header>
      {attention.loading && <p role="status">Loading attention queues…</p>}
      {!attention.loading && !ready && <p role="alert">
        {attention.status === "denied" ? "Your current account cannot view these queues." : "Attention queues could not be loaded. Try refreshing."}
      </p>}
      {data && <>
        {data.canReviewReconciliation && <p><Link to="/payments/reconciliation">Open payment reconciliation review</Link></p>}
        <AttentionQueue title="Charges awaiting approval" queue={data.chargeApprovals}
          caption="Proposed charges awaiting review; amounts are not recorded collections" />
        <AttentionQueue title="Authorized deposit returns awaiting cash return" queue={data.depositReturns}
          caption="Return approval does not establish that cash has been returned" />
        <AttentionQueue title="Unfulfilled extension corrections" queue={data.extensionCorrections}
          caption="Review cash-return or deposit-restoration exceptions in reservation details" />
        <p className="dashboard-screen__updated">
          As of {formatTimestamp(data.asOf)}, Philippine time.
          {" "}<Link to="/reservations">Open reservations</Link>
        </p>
      </>}
      <p className="dashboard-screen__muted">
        This panel records no approvals, collections, refunds, or deposit returns.
        Queue amounts are separate from accommodation collections.
      </p>
    </section>
  );
}
