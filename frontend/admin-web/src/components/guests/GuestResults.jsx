import { Link } from "react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StaffDataState from "../StaffDataState";
import { guestName } from "../../utils/formatters";
import useGuestResults from "../../hooks/useGuestResults.js";

function guestInitials(guest) {
  return (
    [guest.firstName, guest.lastName]
      .map((name) => Array.from(name.trim())[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

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
    <section
      className="record-section guests-screen__results"
      aria-labelledby="guest-results-title"
    >
      <div className="records-heading">
        <div>
          <h2 id="guest-results-title">Guest directory</h2>

          <p className="guests-screen__muted">
            Open a guest record for contact information and reservation history.
          </p>
        </div>

        <button
          type="button"
          className="guests-screen__secondary"
          disabled={state.loading}
          onClick={refreshResults}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh results
        </button>
      </div>

      <StaffDataState state={state} label="Guests" />

      {data && (
        <>
          <p
            className="guests-screen__summary"
            ref={resultSummary}
            role="status"
            tabIndex={-1}
          >
            {data.total === 0
              ? "No guests match the applied search."
              : `Showing ${start}–${end} of ${data.total} matching guests.`}
          </p>

          {data.items.length > 0 && (
            <>
              <p className="guests-screen__muted">
                Most recently updated first. Counts include all reservations
                for each guest at this property, including cancelled
                reservations.
              </p>

              <div
                className="records-scroll"
                role="region"
                aria-label="Matching guests table"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Matching guests associated with this property</caption>

                  <thead>
                    <tr>
                      <th scope="col">Guest</th>
                      <th scope="col">Reservations</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <th scope="row">
                          <Link
                            className="guests-screen__guest-link"
                            to={"/guests/" + encodeURIComponent(item.id)}
                            state={{ guestListSearch: listSearch }}
                          >
                            <span
                              className="guests-screen__avatar"
                              aria-hidden="true"
                            >
                              {guestInitials(item)}
                            </span>

                            <span className="guests-screen__name">
                              {guestName(item)}
                            </span>
                          </Link>
                        </th>

                        <td>
                          <span className="guests-screen__count">
                            {item.reservationCount}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="guests-screen__details-link"
                            to={"/guests/" + encodeURIComponent(item.id)}
                            state={{ guestListSearch: listSearch }}
                            aria-label={`View details for ${guestName(item)}`}
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

              <nav className="guest-pagination" aria-label="Guest result pages">
                <button
                  type="button"
                  className="guests-screen__secondary"
                  disabled={data.page <= 1}
                  onClick={previousPage}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>

                <span className="guests-screen__page-number">
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  className="guests-screen__secondary"
                  disabled={data.page >= Math.min(data.totalPages, 10000)}
                  onClick={nextPage}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p className="guests-screen__muted">
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
