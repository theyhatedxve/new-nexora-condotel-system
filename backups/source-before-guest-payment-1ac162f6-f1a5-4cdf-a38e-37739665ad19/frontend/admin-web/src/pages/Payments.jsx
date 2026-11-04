import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import { useAuth } from "../auth/useAuth";
import { useStaffData } from "../hooks/useStaffData";

import {
  PAYMENT_LIST_METHODS,
  PAYMENT_LIST_STATUSES,
  listPaymentPage,
  parsePaymentListQuery,
  paymentListSearch,
} from "../services/paymentsApi";

import StaffDataState from "../components/StaffDataState";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

function PaymentFilters({
  query,
  onApply,
  onClear,
}) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    method: query.method,
    status: query.status,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

  function edit(name, value) {
    setDraft((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      onApply(
        paymentListSearch({
          ...draft,
          page: 1,
          limit: Number(draft.limit),
        }),
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form
      className="payment-filters"
      onSubmit={submit}
    >
      {error && <p role="alert">{error}</p>}

      <fieldset className="payment-filter-fields">
        <legend>Filter payment records</legend>

        <div>
          <label htmlFor="payment-booking-filter">
            Booking reference
          </label>
          <input
            id="payment-booking-filter"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={(event) =>
              edit("q", event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="payment-method-filter">
            Payment method
          </label>
          <select
            id="payment-method-filter"
            value={draft.method}
            onChange={(event) =>
              edit("method", event.target.value)
            }
          >
            <option value="">All methods</option>

            {PAYMENT_LIST_METHODS.map((method) => (
              <option key={method} value={method}>
                {formatStatus(method)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-status-filter">
            Stored payment status
          </label>
          <select
            id="payment-status-filter"
            value={draft.status}
            onChange={(event) =>
              edit("status", event.target.value)
            }
          >
            <option value="">All stored statuses</option>

            {PAYMENT_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment-page-size">
            Records per page
          </label>
          <select
            id="payment-page-size"
            value={draft.limit}
            onChange={(event) =>
              edit("limit", event.target.value)
            }
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="payment-filter-help">
          Filters apply to individual payment records.
          Collection verification is shown separately.
        </p>

        <div className="actions payment-filter-actions">
          <button type="submit">
            Apply filters
          </button>

          <button
            type="button"
            onClick={onClear}
          >
            Clear filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function PaymentResults({
  query,
  onPage,
}) {
  const state = useStaffData(
    listPaymentPage,
    query,
  );

  const resultSummary = useRef(null);
  const lastQuery = useRef(query);
  const focusAfterRefresh = useRef(false);

  useEffect(() => {
    if (
      state.status === "ready" &&
      state.data.page !== query.page
    ) {
      onPage(state.data.page, true);
    }
  }, [
    state.status,
    state.data,
    query.page,
    onPage,
  ]);

  useEffect(() => {
    if (
      state.status === "ready" &&
      (
        lastQuery.current !== query ||
        focusAfterRefresh.current
      )
    ) {
      resultSummary.current?.focus();
      lastQuery.current = query;
      focusAfterRefresh.current = false;
    }
  }, [state.status, state.data, query]);

  const data =
    state.status === "ready" ? state.data : null;

  const start = data?.items.length
    ? (data.page - 1) * data.limit + 1
    : 0;

  const end = data?.items.length
    ? start + data.items.length - 1
    : 0;

  const listSearch = data
    ? paymentListSearch({
        ...query,
        page: data.page,
      })
    : "";

  return (
    <section
      className="record-section"
      aria-labelledby="payment-results-title"
    >
      <div className="records-heading">
        <h2 id="payment-results-title">
          Payment results
        </h2>

        <button
          type="button"
          disabled={state.loading}
          onClick={() => {
            focusAfterRefresh.current = true;
            state.reload();
          }}
        >
          Refresh results
        </button>
      </div>

      <StaffDataState
        state={state}
        label="Payments"
      />

      {data && (
        <>
          <p
            ref={resultSummary}
            role="status"
            tabIndex={-1}
          >
            {data.total === 0
              ? "No payment records match the applied filters."
              : (
                  "Showing " +
                  start +
                  "–" +
                  end +
                  " of " +
                  data.total +
                  " matching payment records."
                )}
          </p>

          {data.items.length > 0 && (
            <>
              <p>
                Most recently created first. Stored amounts
                describe individual payment records.
              </p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Matching payment records table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Matching payment records</caption>

                  <thead>
                    <tr>
                      <th scope="col">Booking reference</th>
                      <th scope="col">Method</th>
                      <th scope="col">Stored status</th>
                      <th scope="col">Stored amount</th>
                      <th scope="col">Collection verification</th>
                      <th scope="col">Created</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={
                              "/reservations/" +
                              encodeURIComponent(
                                item.reservation.id,
                              )
                            }
                          >
                            {item.reservation.reservationNumber}
                          </Link>
                        </td>

                        <td>{formatStatus(item.method)}</td>
                        <td>{formatStatus(item.status)}</td>

                        <td>
                          {item.currency === "PHP"
                            ? formatPesos(item.amountCentavos)
                            : "Requires review"}
                        </td>

                        <td>
                          {formatStatus(item.verification)}
                        </td>

                        <td>
                          {formatTimestamp(item.createdAt)}
                        </td>

                        <td>
                          <Link
                            to={
                              "/payments/" +
                              encodeURIComponent(item.id)
                            }
                            state={{
                              paymentListSearch: listSearch,
                            }}
                            aria-label={
                              "View payment for " +
                              item.reservation.reservationNumber +
                              ", created " +
                              formatTimestamp(item.createdAt)
                            }
                          >
                            View payment
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="payment-pagination"
                aria-label="Payment result pages"
              >
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() =>
                    onPage(data.page - 1)
                  }
                >
                  Previous
                </button>

                <span>
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    data.page >=
                    Math.min(data.totalPages, 10000)
                  }
                  onClick={() =>
                    onPage(data.page + 1)
                  }
                >
                  Next
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p>
                  Navigation is limited to 10,000 pages.
                  Narrow the filters to reach later records.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function Payments() {
  const { user } = useAuth();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const queryKey = searchParams.toString();

  const canReviewReconciliation = [
    "ADMIN",
    "MANAGER",
  ].includes(user?.role);

  const parsed = useMemo(() => {
    try {
      return {
        query: parsePaymentListQuery(queryKey),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure.message,
      };
    }
  }, [queryKey]);

  const changePage = useCallback(
    (page, replace = false) => {
      if (!parsed.query) return;

      setSearchParams(
        paymentListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  return (
    <section aria-labelledby="payments-title">
      <h1 id="payments-title">Payments</h1>

      {canReviewReconciliation && (
        <p>
          <Link to="/payments/reconciliation">
            Open reconciliation review queues
          </Link>
        </p>
      )}

      <p>
        Stored status and amount describe the payment
        record. Check collection verification before
        treating an amount as received.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            onClick={() => setSearchParams("")}
          >
            Clear invalid filters
          </button>
        </div>
      ) : (
        <>
          <PaymentFilters
            key={queryKey}
            query={parsed.query}
            onApply={(search) =>
              setSearchParams(search)
            }
            onClear={() => setSearchParams("")}
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