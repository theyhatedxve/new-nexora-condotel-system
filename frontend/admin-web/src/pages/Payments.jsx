import { Link } from "react-router";
import usePaymentsPage from "../hooks/usePaymentsPage.js";
import { PaymentFilters } from "../components/payments/PaymentFilters.jsx";
import { PaymentResults } from "../components/payments/PaymentResults.jsx";

export default function Payments() {
  const {
    queryKey,
    canReviewReconciliation,
    parsed,
    changePage,
    clearFilters,
    changeSearchParams,
  } = usePaymentsPage();

  return (
    <section aria-labelledby="payments-title">
      <h1 id="payments-title">Payments</h1>

      {canReviewReconciliation && (
        <p>
          <Link to="/payments/reconciliation">Open reconciliation review queues</Link>
        </p>
      )}

      <p>
        Stored status and amount describe the payment record. Check collection
        verification before treating an amount as received.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
            Clear invalid filters
          </button>
        </div>
      ) : (
        <>
          <PaymentFilters
            key={queryKey}
            query={parsed.query}
            onApply={changeSearchParams}
            onClear={clearFilters}
          />

          <PaymentResults query={parsed.query} onPage={changePage} />
        </>
      )}
    </section>
  );
}
