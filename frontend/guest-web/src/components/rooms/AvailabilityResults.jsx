import RentalDetails from "../RentalDetails.jsx";
import { availabilitySummary } from "../../utils/availabilitySummary.js";
import { Link } from "react-router";
import { toApiUrl } from "../../services/api.js";
import { formatPesos } from "../../utils/formatMoney.js";
export function AvailabilityResults({ query, results, rooms }) {
  const { availableCount, checkoutSearch } = availabilitySummary(results, query);

  return (
    <section className="availability-results" aria-labelledby="search-results-title">
      <h2 id="search-results-title">Search Results</h2>

      <p className="availability-summary">
        Applied stay: {query.checkIn} to {query.checkOut}, {query.guests}{" "}
        {query.guests === 1 ? "guest" : "guests"}.
      </p>

      <p className="availability-summary" role="status">
        {availableCount} available room {availableCount === 1 ? "type" : "types"} for
        these dates.
      </p>

      {results.length === 0 && (
        <p className="rooms-message">
          No room types offer this stay. Try a different rental type, date, or guest count.
        </p>
      )}

      {results.length > 0 && availableCount === 0 && (
        <p className="rooms-message">
          Matching room types exist, but none are available for these dates.
        </p>
      )}

      {results.length > 0 && (
        <div className="availability-results-grid">
          {results.map((result) => {
            const roomDetails = rooms.find((room) => room.id === result.id);

            const roomId = encodeURIComponent(result.id);

            return (
              <article key={result.id} className="availability-result-card">
                {roomDetails?.image ? (
                  <img
                    className="room-card-image"
                    src={toApiUrl(roomDetails.image.url)}
                    alt={roomDetails.image.altText || `${result.name} room`}
                    loading="lazy"
                  />
                ) : (
                  <div className="room-card-image room-card-placeholder">
                    Photo coming soon
                  </div>
                )}

                <div className="availability-result-body">
                  <div className="availability-result-heading">
                    <h3>{result.name}</h3>

                    <span
                      className={
                        result.available
                          ? "availability-badge is-available"
                          : "availability-badge is-unavailable"
                      }
                    >
                      {result.available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <p>
                    Up to {result.capacity} {result.capacity === 1 ? "guest" : "guests"}
                  </p>

                  {result.rentalType ? (
                    <dl className="rental-summary"><RentalDetails value={result} /></dl>
                  ) : (
                    <p>{result.nights} nights · {formatPesos(result.nightlyRateCentavos)} per night</p>
                  )}

                  <div className="availability-total">
                    <span>Total stay price</span>

                    <strong>{formatPesos(result.totalAmountCentavos)}</strong>
                  </div>

                  {result.available ? (
                    <div className="availability-booking-actions">
                      <Link
                        className="outline-button"
                        to={`/rooms/${roomId}?${checkoutSearch}`}
                      >
                        View Room Details
                      </Link>

                      <Link
                        className="outline-button"
                        to={`/checkout/${roomId}?${checkoutSearch}`}
                      >
                        Continue to booking
                      </Link>
                    </div>
                  ) : (
                    <p className="availability-unavailable">
                      Not available for these dates.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="availability-disclaimer">
        These are informational availability results. Prices are calculated by
        NEXORA&apos;s backend. Searching does not reserve a room.
      </p>
    </section>
  );
}
