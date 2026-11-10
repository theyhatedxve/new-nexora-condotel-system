import { Link } from "react-router";
import StaffDataState from "../StaffDataState";
import { guestName } from "../../utils/formatters";
import useGuestResults from "../../hooks/useGuestResults.js";

export function GuestResults({ query, onPage }) {
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
  } = useGuestResults({ query, onPage });

  return (
    <section className="record-section" aria-labelledby="guest-results-title">
      <div className="records-heading">
        <h2 id="guest-results-title">Guest results</h2>

        <button type="button" disabled={state.loading} onClick={refreshResults}>
          Refresh results
        </button>
      </div>

      <StaffDataState state={state} label="Guests" />

      {data && (
        <>
          <p ref={resultSummary} role="status" tabIndex={-1}>
            {data.total === 0
              ? "No guests match the applied search."
              : "Showing " +
                start +
                "–" +
                end +
                " of " +
                data.total +
                " matching guests."}
          </p>

          {data.items.length > 0 && (
            <>
              <p>
                Most recently updated first. Reservation counts include all reservations
                for each guest at this property.
              </p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Matching guests table"
                tabIndex={0}
              >
                <table className="records-table records-table-compact">
                  <caption>Matching guests associated with this property</caption>

                  <thead>
                    <tr>
                      <th scope="col">Guest</th>
                      <th scope="col">Reservations</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={"/guests/" + encodeURIComponent(item.id)}
                            state={{
                              guestListSearch: listSearch,
                            }}
                          >
                            {guestName(item)}
                          </Link>
                        </td>

                        <td>{item.reservationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="guest-pagination" aria-label="Guest result pages">
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
                  Navigation is limited to 10,000 pages. Narrow the search to reach later
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
