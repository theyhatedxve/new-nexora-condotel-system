import { Link } from "react-router";
import usePaymentReconciliationPage from "../hooks/usePaymentReconciliationPage.js";
import { ReconciliationQueues } from "../components/payments/reconciliation/ReconciliationQueues.jsx";

export default function PaymentReconciliation() {
  const { parsed, changePage, normalizePages, changeLimit, clearFilters } =
    usePaymentReconciliationPage();

  return (
    <section aria-labelledby="reconciliation-title">
      <Link to="/payments">Return to payments</Link>

      <h1 id="reconciliation-title">Payment reconciliation</h1>

      <p>
        Review existing payment attempts, pending refunds, and event records. Queue
        membership does not establish payment or refund completion.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
            Clear invalid pagination
          </button>
        </div>
      ) : (
        <ReconciliationQueues
          query={parsed.query}
          onPage={changePage}
          onNormalize={normalizePages}
          onLimit={changeLimit}
        />
      )}
    </section>
  );
}
