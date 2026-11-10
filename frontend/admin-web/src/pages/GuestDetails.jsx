import { Link } from "react-router";
import StaffDataState from "../components/StaffDataState";
import { formatStayDate, formatStatus, guestName } from "../utils/formatters";
import useGuestDetailsPage from "../hooks/useGuestDetailsPage.js";

export default function GuestDetails() {
  const { returnSearch, state, guest } = useGuestDetailsPage();

  return (
    <section aria-labelledby="guest-title">
      <Link
        to={{
          pathname: "/guests",
          search: returnSearch ? "?" + returnSearch : "",
        }}
      >
        Return to guests
      </Link>

      <div className="records-heading">
        <h1 id="guest-title">Guest details</h1>

        <button type="button" onClick={state.reload} disabled={state.loading}>
          Refresh details
        </button>
      </div>

      <StaffDataState state={state} label="Guest details" />

      {state.status === "ready" && (
        <>
          <section className="content-card record-section">
            <h2>{guestName(guest)}</h2>

            <dl className="record-fields">
              <div>
                <dt>Email</dt>
                <dd>{guest.email || "Not provided"}</dd>
              </div>

              <div>
                <dt>Phone</dt>
                <dd>{guest.phone || "Not provided"}</dd>
              </div>

              <div>
                <dt>Reservations at this property</dt>
                <dd>{guest.reservationCount}</dd>
              </div>
            </dl>
          </section>

          <section className="record-section">
            <h2>Reservation history</h2>

            <p>
              Showing {guest.reservations.length} of {guest.reservationCount}{" "}
              reservations. Most recently created first; up to {guest.historyLimit}{" "}
              records.
            </p>

            {guest.reservations.length === 0 ? (
              <p>No reservations found.</p>
            ) : (
              <div
                className="records-scroll"
                role="region"
                aria-label="Guest reservation history"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Reservations for this guest</caption>

                  <thead>
                    <tr>
                      <th scope="col">Booking reference</th>
                      <th scope="col">Room type</th>
                      <th scope="col">Check-in</th>
                      <th scope="col">Check-out</th>
                      <th scope="col">Reservation status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {guest.reservations.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={"/reservations/" + encodeURIComponent(item.id)}>
                            {item.reservationNumber}
                          </Link>
                        </td>

                        <td>{item.roomType.name}</td>
                        <td>{formatStayDate(item.checkInDate)}</td>
                        <td>{formatStayDate(item.checkOutDate)}</td>
                        <td>{formatStatus(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
