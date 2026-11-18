import { Link } from "react-router";
import {
  ArrowRight,
  ClipboardCheck,
  Info,
} from "lucide-react";

import usePaymentsPage from "../hooks/usePaymentsPage.js";
import { PaymentFilters } from "../components/payments/PaymentFilters.jsx";
import { PaymentResults } from "../components/payments/PaymentResults.jsx";

import "../styles/payments.css";
import "../styles/payment-workspace.css";

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
    <section
      className="payments-screen payment-ui"
      aria-labelledby="payments-title"
    >
      <header className="payment-ui__toolbar">
        <div>
          <h1 id="payments-title" className="payment-ui__sr-only">
            Payments
          </h1>

          <p className="payment-ui__intro">
            Browse payment records and review collection verification.
          </p>
        </div>

        {canReviewReconciliation && (
          <Link
            className="payments-screen__secondary"
            to="/payments/reconciliation"
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            Reconciliation Review
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      <p className="payments-screen__notice payment-ui__notice">
        <Info size={19} aria-hidden="true" />
        <span>
          Stored status and amount describe the payment record. Check
          collection verification before treating an amount as received.
          Stored amounts are not net collections after refunds.
        </span>
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

          <PaymentResults
            query={parsed.query}
            onPage={changePage}
          />
        </>
      )}
    </section>
  );
}