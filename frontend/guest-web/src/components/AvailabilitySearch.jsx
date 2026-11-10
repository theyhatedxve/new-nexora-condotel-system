import { Link } from "react-router";
import { formatCentavos } from "../utils/availabilitySearch.js";
import { getPhilippineToday } from "../utils/availabilitySearch.js";
import useAvailabilitySearch from "../hooks/useAvailabilitySearch.js";
import "../styles/availability-search.css";

export default function AvailabilitySearch() {
  const {
    checkIn,
    changeCheckIn,
    checkOut,
    changeCheckOut,
    guests,
    changeGuests,
    results,
    error,
    loading,
    hasSearched,
    handleSearch,
    retrySearch,
  } = useAvailabilitySearch();

  return (
    <section className="availability-search" aria-labelledby="availability-heading">
      <h2 id="availability-heading">Find Your Perfect Stay</h2>

      <p>Choose your dates and number of guests to check available rooms.</p>

      <form onSubmit={handleSearch}>
        <div className="availability-fields">
          <label>
            Check-in
            <input
              type="date"
              value={checkIn}
              min={getPhilippineToday()}
              required
              onChange={changeCheckIn}
            />
          </label>

          <label>
            Check-out
            <input
              type="date"
              value={checkOut}
              min={checkIn || getPhilippineToday()}
              required
              onChange={changeCheckOut}
            />
          </label>

          <label>
            Guests
            <input
              type="number"
              value={guests}
              min="1"
              max="2147483647"
              step="1"
              required
              onChange={changeGuests}
            />
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Available Rooms"}
        </button>
      </form>

      {error && (
        <div className="guest-feedback" role="alert">
          <h3>Search unsuccessful</h3>

          <p>{error}</p>

          <button type="button" className="feedback-retry-button" onClick={retrySearch}>
            Try Again
          </button>
        </div>
      )}

      <div aria-live="polite" aria-busy={loading}>
        {loading && <p>Checking room availability...</p>}

        {results !== null && (
          <div className="availability-results">
            <h3>Search Results</h3>

            {hasSearched && results.length === 0 && (
              <div className="guest-feedback" role="status">
                <h3>No matching rooms</h3>

                <p>
                  No room types match your guest count. Try changing the number of guests
                  or selecting different dates.
                </p>
              </div>
            )}

            {hasSearched &&
              results.length > 0 &&
              results.every((room) => !room.available) && (
                <div className="guest-feedback" role="status">
                  <h3>No rooms available for these dates</h3>

                  <p>
                    Matching room types exist, but none are available for the selected
                    stay. Please try another date range.
                  </p>
                </div>
              )}

            {results.map((room) => (
              <article key={room.id} className="availability-result">
                <div className="availability-result-header">
                  <h4>{room.name}</h4>

                  <span>{room.available ? "Available" : "Unavailable"}</span>
                </div>

                <p>Maximum {room.capacity} guests</p>

                <p>
                  {formatCentavos(room.nightlyRateCentavos)}
                  {" / night"}
                </p>

                <p>
                  {room.nights} {room.nights === 1 ? "night" : "nights"}
                </p>

                <strong>Total: {formatCentavos(room.totalAmountCentavos)}</strong>

                {room.available ? (
                  <Link to={`/rooms/${room.id}`}>View Room Details</Link>
                ) : (
                  <p>This room type is unavailable for these dates.</p>
                )}
              </article>
            ))}

            <p className="availability-note">
              Availability and prices are informational. A room is not reserved until a
              booking is successfully created and confirmed.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
