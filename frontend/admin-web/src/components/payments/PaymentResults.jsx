import { Link } from "react-router";
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
    <section className="record-section" aria-labelledby="payment-results-title">
      <div className="records-heading">
        <h2 id="payment-results-title">Payment results</h2>

        <button type="button" disabled={state.loading} onClick={refreshResults}>
          Refresh results
        </button>
      </div>

      <StaffDataState state={state} label="Payments" />

      {data && (
        <>
          <p ref={resultSummary} role="status" tabIndex={-1}>
            {data.total === 0
              ? "No payment records match the applied filters."
              : "Showing " +
                start +
                "–" +
                end +
                " of " +
                data.total +
                " matching payment records."}
          </p>

          {data.items.length > 0 && (
            <>
              <p>
                Most recently created first. Stored amounts describe individual payment
                records.
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
                              "/reservations/" + encodeURIComponent(item.reservation.id)
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

                        <td>{formatStatus(item.verification)}</td>

                        <td>{formatTimestamp(item.createdAt)}</td>

                        <td>
                          <Link
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
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="payment-pagination" aria-label="Payment result pages">
                <button type="button" disabled={data.page <= 1} onClick={previousPage}>
                  Previous
                </button>

                <span>
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={data.page >= Math.min(data.totalPages, 10000)}
                  onClick={nextPage}
                >
                  Next
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p>
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
