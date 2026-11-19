import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth/useAuth.js";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import { DEPOSIT_MOVEMENT_LABELS, getDepositReport } from "../services/depositReportsApi.js";
import { formatPesos, formatTimestamp } from "../../../shared/utils/formatters.js";

export default function DepositReport({ query }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const request = useMemo(() => ({
    from: query.from, to: query.to, page, staffScope: `${user.id}:${user.role}`,
  }), [query.from, query.to, page, user.id, user.role]);
  const state = useStaffData(getDepositReport, request);
  const data = state.status === "ready" ? state.data : null;
  return (
    <section className="reports-section deposit-report" aria-labelledby="deposit-report-title" aria-busy={state.loading}>
      <header className="reports-page__section-heading">
        <h2 id="deposit-report-title">Deposit movements</h2>
        <p>Applied range: {query.from} through {query.to}, Philippine time.
          Totals cover the entire range, not just this page.</p>
      </header>
      <p className="reports-page__notice">
        Deposits are separate from accommodation collections and revenue.
        Deductions and restorations are ledger movements.
        Return approvals are excluded until an actual return is recorded.
      </p>
      <button type="button" className="reports-page__secondary" disabled={state.loading} onClick={state.reload}>
        Refresh deposit report
      </button>
      {state.loading && <p role="status">Loading deposit movements…</p>}
      {!state.loading && !data && <p role="alert">
        {state.status === "denied" ? "Your current account cannot access deposit reports."
          : state.status === "review" ? "Deposit records require review. Totals are unavailable."
            : "The deposit report could not be loaded. Try refreshing."}
      </p>}
      {data && <>
        <p className="reports-page__timestamp">Calculated {formatTimestamp(data.asOf)}, Philippine time.</p>
        <div className="reports-page__metrics reports-page__financial">
          {Object.entries(DEPOSIT_MOVEMENT_LABELS).map(([kind, title]) => (
            <article className="reports-page__metric" key={kind}>
              <h3>{title}</h3><p className="reports-page__value">{formatPesos(data.totals[kind])}</p>
            </article>
          ))}
        </div>
        {data.total === 0 && <p role="status">No recorded deposit movements match this range.</p>}
        {data.items.length > 0 && (
          <div className="deposit-report__scroll" role="region" aria-label="Deposit movements table" tabIndex={0}>
            <table>
              <caption>Recorded deposit movements, newest first</caption>
              <thead><tr><th scope="col">Reservation</th><th scope="col">Movement</th>
                <th scope="col">Amount</th><th scope="col">Recorded</th></tr></thead>
              <tbody>{data.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row"><Link to={`/reservations/${encodeURIComponent(item.reservationId)}`}>{item.reservationNumber}</Link></th>
                  <td>{DEPOSIT_MOVEMENT_LABELS[item.kind]}</td><td>{formatPesos(item.amountCentavos)}</td>
                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="deposit-report__pagination">
          <p>Page {page}. Showing {data.items.length} of {data.total} movements.</p>
          {page > 1 && <button type="button" onClick={() => setPage(1)}>First page</button>}
          <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <button type="button" disabled={page >= 10000 || page * 20 >= data.total}
            onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </>}
    </section>
  );
}
