import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import { listPayments } from "../services/paymentsApi";
import StaffDataState from "../components/StaffDataState";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

export default function Payments() {
  const state = useStaffData(listPayments);

  return (
    <section aria-labelledby="payments-title">
      <div className="records-heading">
        <h1 id="payments-title">Payments</h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh payments
        </button>
      </div>

      <p>
        Stored amounts describe individual payment records.
        Check collection verification before treating an
        amount as received.
      </p>

      <StaffDataState
        state={state}
        label="Payments"
      />

      {state.status === "ready" && (
        <>
          <p>
            Showing {state.data.items.length} of{" "}
            {state.data.total} payment records.
            Most recently created first; up to{" "}
            {state.data.limit} records.
          </p>

          {state.data.items.length === 0 ? (
            <p role="status">
              No payment records found for this property.
            </p>
          ) : (
            <div
              className="records-scroll"
              role="region"
              aria-label="Payments table"
              tabIndex={0}
            >
              <table className="records-table">
                <caption>Latest payment records</caption>

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
                  {state.data.items.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <Link
                          to={
                            "/reservations/" +
                            encodeURIComponent(
                              payment.reservation.id,
                            )
                          }
                        >
                          {payment.reservation.reservationNumber}
                        </Link>
                      </td>

                      <td>{formatStatus(payment.method)}</td>
                      <td>{formatStatus(payment.status)}</td>

                      <td>
                        {payment.currency === "PHP"
                          ? formatPesos(payment.amountCentavos)
                          : "Requires review"}
                      </td>

                      <td>
                        {formatStatus(payment.verification)}
                      </td>

                      <td>
                        {formatTimestamp(payment.createdAt)}
                      </td>

                      <td>
                        <Link
                          to={
                            "/payments/" +
                            encodeURIComponent(payment.id)
                          }
                          aria-label={
                            "View payment for " +
                            payment.reservation.reservationNumber +
                            ", created " +
                            formatTimestamp(payment.createdAt)
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
          )}
        </>
      )}
    </section>
  );
}