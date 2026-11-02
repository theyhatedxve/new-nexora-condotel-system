import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import { listReservations } from "../services/reservationsApi";
import StaffDataState from "../components/StaffDataState";

import {
  formatStayDate,
  formatStatus,
  guestName,
} from "../utils/formatters";

export default function Reservations() {
  const state = useStaffData(listReservations);

  return (
    <section aria-labelledby="reservations-title">
      <div className="records-heading">
        <h1 id="reservations-title">
          Reservations
        </h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh reservations
        </button>
      </div>

      <StaffDataState
        state={state}
        label="Reservations"
      />

      {state.status === "ready" && (
        <>
          <p>
            Showing {state.data.items.length} of{" "}
            {state.data.total} reservations. Most recently
            created first; up to {state.data.limit} records.
          </p>

          {state.data.items.length === 0 ? (
            <p role="status">
              No reservations found for this property.
            </p>
          ) : (
            <div
              className="records-scroll"
              role="region"
              aria-label="Reservations table"
              tabIndex={0}
            >
              <table className="records-table">
                <caption>Latest reservations</caption>

                <thead>
                  <tr>
                    <th scope="col">Booking reference</th>
                    <th scope="col">Guest</th>
                    <th scope="col">Room type</th>
                    <th scope="col">Check-in</th>
                    <th scope="col">Check-out</th>
                    <th scope="col">Guests</th>
                    <th scope="col">Reservation status</th>
                  </tr>
                </thead>

                <tbody>
                  {state.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          to={
                            "/reservations/" +
                            encodeURIComponent(item.id)
                          }
                        >
                          {item.reservationNumber}
                        </Link>
                      </td>

                      <td>
                        <Link
                          to={
                            "/guests/" +
                            encodeURIComponent(item.guest.id)
                          }
                        >
                          {guestName(item.guest)}
                        </Link>
                      </td>

                      <td>{item.roomType.name}</td>
                      <td>{formatStayDate(item.checkInDate)}</td>
                      <td>{formatStayDate(item.checkOutDate)}</td>
                      <td>{item.guestCount}</td>
                      <td>{formatStatus(item.status)}</td>
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