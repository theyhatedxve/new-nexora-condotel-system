import { PAYMENT_LIST_METHODS, PAYMENT_LIST_STATUSES } from "../../services/paymentsApi";
import { formatStatus } from "../../utils/formatters";
import usePaymentFilters from "../../hooks/usePaymentFilters.js";

export function PaymentFilters({ query, onApply, onClear }) {
  const { draft, error, submit, changeQ, changeMethod, changeStatus, changeLimit } =
    usePaymentFilters({ query, onApply });

  return (
    <form className="payment-filters" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}

      <fieldset className="payment-filter-fields">
        <legend>Filter payment records</legend>

        <div>
          <label htmlFor="payment-booking-filter">Booking reference</label>
          <input
            id="payment-booking-filter"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={changeQ}
          />
        </div>

        <div>
          <label htmlFor="payment-method-filter">Payment method</label>
          <select id="payment-method-filter" value={draft.method} onChange={changeMethod}>
            <option value="">All methods</option>

            {PAYMENT_LIST_METHODS.map((method) => (
              <option key={method} value={method}>
                {formatStatus(method)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-status-filter">Stored payment status</label>
          <select id="payment-status-filter" value={draft.status} onChange={changeStatus}>
            <option value="">All stored statuses</option>

            {PAYMENT_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-page-size">Records per page</label>
          <select id="payment-page-size" value={draft.limit} onChange={changeLimit}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="payment-filter-help">
          Filters apply to individual payment records. Collection verification is shown
          separately.
        </p>

        <div className="actions payment-filter-actions">
          <button type="submit">Apply filters</button>

          <button type="button" onClick={onClear}>
            Clear filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}
