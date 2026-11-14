import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
        <div>
          <h2 id="reservation-results-title">Reservation results</h2>
          <p className="reservations-screen__muted">Most recently created first.</p>
        </div>

        <button type="button" className="reservations-screen__secondary" disabled={state.loading} onClick={refreshResults}>
          <RefreshCw size={17} aria-hidden="true" />
          {state.loading ? "Refreshing…" : "Refresh results"}
        </button>
      </div>

      <StaffDataState state={state} label="Reservations" />

      {data && (
        <>
          <p ref={summaryHeading} tabIndex={-1} role="status" className="reservations-screen__summary">
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
                      <th scope="col">Stay dates</th>
                      <th scope="col">Guests</th>
                      <th scope="col">Reservation status</th>
                      <th scope="col">Actions</th>
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

                        <td>
                          <span className="reservations-screen__stay-date">Check-in: {formatStayDate(item.checkInDate)}</span>
                          <span className="reservations-screen__stay-date">Check-out: {formatStayDate(item.checkOutDate)}</span>
                        </td>

                        <td>{item.guestCount}</td>

                        <td>
                          <span className="reservations-screen__badge" data-status={item.status}>
                            {formatStatus(item.status)}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="reservations-screen__details-link"
                            to={"/reservations/" + encodeURIComponent(item.id)}
                            state={{ reservationListSearch: listSearch }}
                            aria-label={`View details for ${item.reservationNumber}`}
                          >
                            View details
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="reservation-pagination"
                aria-label="Reservation result pages"
              >
                <button type="button" className="reservations-screen__secondary" disabled={data.page <= 1} onClick={previousPage}>
                  <ChevronLeft size={17} aria-hidden="true" />
                  Previous
                </button>

                <span className="reservations-screen__page-number" aria-current="page">
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  className="reservations-screen__secondary"
                  disabled={data.page >= Math.min(data.totalPages, 10000)}
                  onClick={nextPage}
                >
                  Next
                  <ChevronRight size={17} aria-hidden="true" />
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
