import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { useStaffData } from "../../hooks/useStaffData";
import {
  EXCEPTION_REASON_LABELS, EXCEPTION_STATE_LABELS, getFinancialExceptionReport,
} from "../../services/financialExceptionReportsApi.js";
import { formatTimestamp } from "../../utils/formatters";

export default function FinancialExceptionReport({ query }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const request = useMemo(() => ({
    from: query.from, to: query.to, page, staffScope: `${user.id}:${user.role}`,
  }), [query.from, query.to, page, user.id, user.role]);
  const state = useStaffData(getFinancialExceptionReport, request);
  const data = state.status === "ready" ? state.data : null;
  return (
    <section className="reports-section exception-report" aria-labelledby="exception-report-title" aria-busy={state.loading}>
      <header className="reports-page__section-heading">
        <h2 id="exception-report-title">Financial-exception notices</h2>
        <p>First recorded {query.from} through {query.to}, Philippine time. Statuses describe the current records.</p>
      </header>
      <p className="reports-page__notice">
        Internal notices are not provider payment evidence.
        Resolved notices do not by themselves prove refund completion.
        Historical status snapshots are not reconstructed.
      </p>
      <p><Link to="/payments/reconciliation">Open reconciliation review</Link></p>
      <button type="button" className="reports-page__secondary" disabled={state.loading} onClick={state.reload}>
        Refresh exception report
      </button>
      {state.loading && <p role="status">Loading financial notices…</p>}
      {!state.loading && !data && <p role="alert">
        {state.status === "denied" ? "Current Super Admin permission is required." : "The exception report could not be loaded. Try refreshing."}
      </p>}
      {data && <>
        <p className="reports-page__timestamp">
          Calculated {formatTimestamp(data.asOf)}, Philippine time. Counts cover the entire selected period.
        </p>
        <div className="reports-page__metrics">
          {Object.entries(EXCEPTION_STATE_LABELS).map(([key, title]) => (
            <article className="reports-page__metric" key={key}>
              <h3>{title}</h3><p className="reports-page__value">{data.counts[key]}</p>
            </article>
          ))}
        </div>
        {data.total === 0 && <p role="status">No internal financial notices match this range.</p>}
        {data.items.length > 0 && <div className="exception-report__scroll" role="region" aria-label="Financial-exception notices" tabIndex={0}>
          <table>
            <caption>Notices first recorded in this range, newest first</caption>
            <thead><tr>
              <th scope="col">Reservation</th><th scope="col">Current status</th><th scope="col">Last recorded reason</th>
              <th scope="col">First recorded</th><th scope="col">Last processing update</th><th scope="col">Payment</th>
            </tr></thead>
            <tbody>{data.items.map((item) => (
              <tr key={item.id}>
                <th scope="row"><Link to={`/reservations/${encodeURIComponent(item.reservationId)}`}>{item.reservationNumber}</Link></th>
                <td>{EXCEPTION_STATE_LABELS[item.state]}</td><td>{EXCEPTION_REASON_LABELS[item.reason]}</td>
                <td>{formatTimestamp(item.createdAt)}</td><td>{formatTimestamp(item.lastUpdatedAt)}</td>
                <td><Link to={`/payments/${encodeURIComponent(item.paymentId)}`}>View payment</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
        <div className="exception-report__pagination">
          <p>Page {page}. Showing {data.items.length} of {data.total} notices.</p>
          {page > 1 && <button type="button" onClick={() => setPage(1)}>First page</button>}
          <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <button type="button" disabled={page >= 10000 || page * 20 >= data.total} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </>}
    </section>
  );
}
