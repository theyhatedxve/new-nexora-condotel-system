import { Link } from "react-router";
import StaffDataState from "../../StaffDataState";
import ReconciliationActions from "../../ReconciliationActions";
import { formatPesos, formatStatus, formatTimestamp } from "../../../utils/formatters";
import useReconciliationQueues from "../../../hooks/useReconciliationQueues.js";
import { QueueTable } from "./QueueTable.jsx";
import { QueueSection } from "./QueueSection.jsx";

export function ReconciliationQueues({ query, onPage, onNormalize, onLimit }) {
  const {
    state,
    paymentHeading,
    refundHeading,
    eventHeading,
    data,
    navigate,
    changePageSize,
  } = useReconciliationQueues({ query, onPage, onNormalize, onLimit });

  return (
    <>
      <div className="records-heading">
        <button type="button" onClick={state.reload} disabled={state.loading}>
          Refresh review queues
        </button>

        <div className="reconciliation-page-size">
          <label htmlFor="reconciliation-page-size">Records per queue page</label>
          <select
            id="reconciliation-page-size"
            value={String(query.limit)}
            onChange={changePageSize}
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <p>Older records appear first. Each queue has its own page selection.</p>

      <StaffDataState state={state} label="Reconciliation queues" />

      {data && (
        <>
          <QueueSection
            name="payments"
            title="Payment records for review"
            headingRef={paymentHeading}
            meta={data.pagination.payments}
            onPage={navigate}
          >
            <QueueTable
              label="Payment review table"
              caption="PayMongo payment records selected for review"
              headings={[
                "Payment record",
                "Reservation",
                "Stored status",
                "Checkout state",
                "Stored amount",
                "Created",
              ]}
            >
              {data.payments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={"/payments/" + encodeURIComponent(item.id)}>{item.id}</Link>
                  </td>

                  <td>
                    <Link to={"/reservations/" + encodeURIComponent(item.reservationId)}>
                      View reservation
                    </Link>
                  </td>

                  <td>{formatStatus(item.status)}</td>

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

                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>

          <QueueSection
            name="refunds"
            title="Pending PayMongo refunds"
            headingRef={refundHeading}
            meta={data.pagination.refunds}
            onPage={navigate}
          >
            <QueueTable
              label="Pending refund review table"
              caption="Pending refunds awaiting review"
              headings={[
                "Refund record",
                "Related payment",
                "Provider refund reference",
                "Stored status",
                "Stored amount, centavos",
                "Requested",
              ]}
            >
              {data.refunds.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>

                  <td>
                    <Link to={"/payments/" + encodeURIComponent(item.paymentId)}>
                      View payment
                    </Link>
                  </td>

                  <td>{item.providerRefundId || "Not recorded"}</td>

                  <td>{formatStatus(item.status)}</td>

                  <td>{item.amountCentavos.toLocaleString("en-PH")}</td>

                  <td>{formatTimestamp(item.requestedAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>

          <QueueSection
            name="events"
            title="Event records for review"
            headingRef={eventHeading}
            meta={data.pagination.events}
            onPage={navigate}
          >
            <QueueTable
              label="Event review table"
              caption="Payment and refund events selected for review"
              headings={[
                "Event reference",
                "Related payment",
                "Event type",
                "Stored status",
                "Review note",
                "Created",
              ]}
            >
              {data.events.map((item) => (
                <tr key={item.providerEventId}>
                  <td>{item.providerEventId}</td>

                  <td>
                    {item.paymentId ? (
                      <Link to={"/payments/" + encodeURIComponent(item.paymentId)}>
                        View payment
                      </Link>
                    ) : (
                      "Not linked to a payment"
                    )}
                  </td>

                  <td>{item.eventType}</td>
                  <td>{formatStatus(item.status)}</td>
                  <td>{item.reviewReason}</td>
                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>
        </>
      )}

      <ReconciliationActions queue={state} />
    </>
  );
}
