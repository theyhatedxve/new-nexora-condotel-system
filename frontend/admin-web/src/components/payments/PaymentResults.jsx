import { Link } from "react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StaffDataState from "../StaffDataState";
import { formatPesos, formatStatus, formatTimestamp } from "../../utils/formatters";
import usePaymentResults from "../../hooks/usePaymentResults.js";

export function PaymentResults({ query, onPage }) {
  const {
    state,
    resultSummary,
    data,
    start,
    end,
    listSearch,
    refreshResults,
    previousPage,
    nextPage,
  } = usePaymentResults({ query, onPage });

  return (
    <section
      className="record-section payments-screen__results"
      aria-labelledby="payment-results-title"
    >
      <div className="records-heading">
        <div>
          <h2 id="payment-results-title">Payment records</h2>

          <p className="payments-screen__muted">
            Open a payment to review its collection and refund details.
          </p>
        </div>

        <button
          type="button"
          className="payments-screen__secondary"
          disabled={state.loading}
          onClick={refreshResults}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh results
        </button>
      </div>

      <StaffDataState state={state} label="Payments" />

      {data && (
        <>
          <p
            className="payments-screen__summary"
            ref={resultSummary}
            role="status"
            tabIndex={-1}
          >
            {data.total === 0
              ? "No payment records match the applied filters."
              : `Showing ${start}–${end} of ${data.total} matching payment records.`}
          </p>

          {data.items.length > 0 && (
            <>
              <p className="payments-screen__muted">
                Most recently created first. Stored amounts describe individual
                payment records.
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
                            className="payments-screen__booking-link"
                            to={
                              "/reservations/" + encodeURIComponent(item.reservation.id)
                            }
                          >
                            {item.reservation.reservationNumber}
                          </Link>
                        </td>

                        <td>{formatStatus(item.method)}</td>
                        <td>
                          <span
                            className="payments-screen__badge"
                            data-status={item.status}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>

                        <td className="payments-screen__amount">
                          {item.currency === "PHP"
                            ? formatPesos(item.amountCentavos)
                            : "Requires review"}
                        </td>

                        <td>
                          <span
                            className="payments-screen__badge"
                            data-verification={item.verification}
                          >
                            {formatStatus(item.verification)}
                          </span>
                        </td>

                        <td className="payments-screen__created">
                          {formatTimestamp(item.createdAt)}
                        </td>

                        <td>
                          <Link
                            className="payments-screen__details-link"
                            to={"/payments/" + encodeURIComponent(item.id)}
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
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="payment-pagination" aria-label="Payment result pages">
                <button
                  type="button"
                  className="payments-screen__secondary"
                  disabled={data.page <= 1}
                  onClick={previousPage}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>

                <span className="payments-screen__page-number">
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  className="payments-screen__secondary"
                  disabled={data.page >= Math.min(data.totalPages, 10000)}
                  onClick={nextPage}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p className="payments-screen__muted">
                  Navigation is limited to 10,000 pages. Narrow the filters to reach later
                  records.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
