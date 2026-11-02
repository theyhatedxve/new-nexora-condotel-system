import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";

import {
  listReconciliation,
} from "../services/reconciliationApi";

import StaffDataState from "../components/StaffDataState";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

import ReconciliationActions from "../components/ReconciliationActions";

export default function PaymentReconciliation() {
  const state = useStaffData(listReconciliation);

  const data =
    state.status === "ready" ? state.data : null;

  return (
    <section aria-labelledby="reconciliation-title">
      <Link to="/payments">Return to payments</Link>

      <div className="records-heading">
        <h1 id="reconciliation-title">
          Payment reconciliation
        </h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh review queues
        </button>
      </div>

      <p>
        Review PayMongo payment attempts, pending refunds,
        and event records. Open payment details to check
        verified financial figures.
      </p>

      <p>
        A queue entry does not establish that a payment
        was received or a refund completed.
      </p>

      <StaffDataState
        state={state}
        label="Reconciliation queues"
      />

      {data && (
        <>
          <p>
            Older records appear first. Each section shows
            up to {data.limit} entries. Additional records
            may exist beyond this view.
          </p>

          <section
            className="record-section"
            aria-labelledby="review-payments-title"
          >
            <h2 id="review-payments-title">
              Payment records for review
            </h2>

            <p>
              Entries shown: {data.payments.length}
            </p>

            {data.payments.length === 0 ? (
              <p role="status">
                No payment records in this review queue.
              </p>
            ) : (
              <div
                className="records-scroll"
                role="region"
                aria-label="Payment review table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>
                    PayMongo payment records selected for review
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Payment record</th>
                      <th scope="col">Reservation</th>
                      <th scope="col">Stored status</th>
                      <th scope="col">Checkout state</th>
                      <th scope="col">Stored amount</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.payments.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={
                              "/payments/" +
                              encodeURIComponent(item.id)
                            }
                          >
                            {item.id}
                          </Link>
                        </td>

                        <td>
                          <Link
                            to={
                              "/reservations/" +
                              encodeURIComponent(
                                item.reservationId,
                              )
                            }
                          >
                            View reservation
                          </Link>
                        </td>

                        <td>
                          {formatStatus(item.status)}
                        </td>

                        <td>
                          {item.checkoutState
                            ? formatStatus(item.checkoutState)
                            : "Not recorded"}
                        </td>

                        <td>
                          {item.currency === "PHP"
                            ? formatPesos(item.amountCentavos)
                            : item.currency + " — review required"}
                        </td>

                        <td>
                          {formatTimestamp(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="record-section"
            aria-labelledby="review-refunds-title"
          >
            <h2 id="review-refunds-title">
              Pending PayMongo refunds
            </h2>

            <p>
              Entries shown: {data.refunds.length}
            </p>

            {data.refunds.length === 0 ? (
              <p role="status">
                No pending refunds in this review queue.
              </p>
            ) : (
              <div
                className="records-scroll"
                role="region"
                aria-label="Pending refund review table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>
                    Pending refunds awaiting review
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Refund record</th>
                      <th scope="col">Related payment</th>
                      <th scope="col">Provider refund reference</th>
                      <th scope="col">Stored status</th>
                      <th scope="col">Stored amount, centavos</th>
                      <th scope="col">Requested</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.refunds.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>

                        <td>
                          <Link
                            to={
                              "/payments/" +
                              encodeURIComponent(item.paymentId)
                            }
                          >
                            View payment
                          </Link>
                        </td>

                        <td>
                          {item.providerRefundId || "Not recorded"}
                        </td>

                        <td>{formatStatus(item.status)}</td>

                        <td>
                          {item.amountCentavos.toLocaleString(
                            "en-PH",
                          )}
                        </td>

                        <td>
                          {formatTimestamp(item.requestedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="record-section"
            aria-labelledby="review-events-title"
          >
            <h2 id="review-events-title">
              Event records for review
            </h2>

            <p>
              Entries shown: {data.events.length}
            </p>

            {data.events.length === 0 ? (
              <p role="status">
                No event records in this review queue.
              </p>
            ) : (
              <div
                className="records-scroll"
                role="region"
                aria-label="Event review table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>
                    Payment and refund events selected for review
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Event reference</th>
                      <th scope="col">Related payment</th>
                      <th scope="col">Event type</th>
                      <th scope="col">Stored status</th>
                      <th scope="col">Review note</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.events.map((item) => (
                      <tr key={item.providerEventId}>
                        <td>{item.providerEventId}</td>

                        <td>
                          {item.paymentId ? (
                            <Link
                              to={
                                "/payments/" +
                                encodeURIComponent(
                                  item.paymentId,
                                )
                              }
                            >
                              View payment
                            </Link>
                          ) : (
                            "Not linked to a payment"
                          )}
                        </td>

                        <td>{item.eventType}</td>
                        <td>{formatStatus(item.status)}</td>
                        <td>{item.reviewReason}</td>

                        <td>
                          {formatTimestamp(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <ReconciliationActions queue={state} />
    </section>
  );
}