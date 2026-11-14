import { Link } from "react-router";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import usePaymentsPage from "../hooks/usePaymentsPage.js";
import { PaymentFilters } from "../components/payments/PaymentFilters.jsx";
import { PaymentResults } from "../components/payments/PaymentResults.jsx";
import "../styles/payments.css";

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
    <section className="payments-screen" aria-labelledby="payments-title">
      <header className="payments-screen__heading">
        <div>
          <h1 id="payments-title">Payments</h1>
          <p>Browse payment records and review collection verification.</p>
        </div>

        {canReviewReconciliation && (
          <Link
            className="payments-screen__secondary"
            to="/payments/reconciliation"
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            Reconciliation review
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      <p className="payments-screen__notice">
        Stored status and amount describe the payment record. Check collection
        verification before treating an amount as received. Stored amounts are
        not net collections after refunds.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="payments-screen__secondary"
            onClick={clearFilters}
          >
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
