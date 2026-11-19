import { Link } from "react-router";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

import usePaymentReconciliationPage from "../hooks/usePaymentReconciliationPage.js";
import { ReconciliationQueues } from "../components/ReconciliationQueues.jsx";

import "../styles/payment-workspace.css";

export default function PaymentReconciliation() {
  const {
    parsed,
    changePage,
    normalizePages,
    changeLimit,
    clearFilters,
  } = usePaymentReconciliationPage();

  return (
    <section
      className="payment-reconciliation-screen payment-ui"
      aria-labelledby="reconciliation-title"
    >
      <header className="payment-ui__toolbar">
        <Link className="payment-ui__back" to="/payments">
          <ArrowLeft size={17} aria-hidden="true" />
          Return to payments
        </Link>
      </header>

      <h1
        id="reconciliation-title"
        className="payment-ui__sr-only"
      >
        Payment reconciliation
      </h1>

      <section
        className="payment-ui__card"
        aria-labelledby="reconciliation-overview-title"
      >
        <h2 id="reconciliation-overview-title">
          <ClipboardCheck size={22} aria-hidden="true" />
          Financial Review
        </h2>

        <p className="payment-ui__muted">
          Review existing payment attempts, pending refunds, and event
          records. Queue membership does not establish payment or
          refund completion.
        </p>

        <p className="payment-ui__notice">
          Internal financial notices describe booking-level issues;
          they are not provider paid-event evidence. Open the related
          payment, then its reservation, to review current records.
          Pending refunds do not reduce net collection until completion
          is verified.
        </p>
      </section>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="payment-ui__secondary"
            onClick={clearFilters}
          >
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