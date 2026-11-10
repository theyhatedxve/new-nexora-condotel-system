import { Link } from "react-router";
import StaffDataState from "../StaffDataState";
import { formatStayDate, formatStatus, guestName } from "../../utils/formatters";
import useReservationResults from "../../hooks/useReservationResults.js";

export function ReservationResults({ query, onPage }) {
  const {
    state,
    summaryHeading,
    data,
    start,
    end,
    listSearch,
    refreshResults,
    previousPage,
    nextPage,
  } = useReservationResults({ query, onPage });

  return (
    <section className="record-section" aria-labelledby="reservation-results-title">
      <div className="records-heading">
        <h2 id="reservation-results-title">Reservation results</h2>

        <button type="button" disabled={state.loading} onClick={refreshResults}>
          Refresh results
        </button>
      </div>

      <StaffDataState state={state} label="Reservations" />

      {data && (
        <>
          <p ref={summaryHeading} tabIndex={-1} role="status">
            {data.total === 0
              ? "No reservations match the applied filters."
              : "Showing " +
                start +
                "–" +
                end +
                " of " +
                data.total +
                " matching reservations."}
          </p>

          {data.items.length > 0 && (
            <>
              <p>Most recently created first.</p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Filtered reservations table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Matching reservations</caption>

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
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={"/reservations/" + encodeURIComponent(item.id)}
                            state={{
                              reservationListSearch: listSearch,
                            }}
                          >
                            {item.reservationNumber}
                          </Link>
                        </td>

                        <td>
                          <Link to={"/guests/" + encodeURIComponent(item.guest.id)}>
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

              <nav
                className="reservation-pagination"
                aria-label="Reservation result pages"
              >
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
