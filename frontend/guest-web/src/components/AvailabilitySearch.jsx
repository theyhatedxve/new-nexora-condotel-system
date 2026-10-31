
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { searchAvailability } from "../services/availabilityApi";
import "./AvailabilitySearch.css";

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatCentavos(amount) {
  return moneyFormatter.format(amount / 100);
}

function getPhilippineToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (name) =>
    parts.find((part) => part.type === name)?.value;

  return [
    getPart("year"),
    getPart("month"),
    getPart("day"),
  ].join("-");
}

function differenceInNights(checkIn, checkOut) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);

  return Math.round((end - start) / 86400000);
}

function validateSearch({ checkIn, checkOut, guests }) {
  if (!checkIn || !checkOut) {
    return "Please select check-in and check-out dates.";
  }

  if (checkIn < getPhilippineToday()) {
    return "Check-in cannot be in the past.";
  }

  const nights = differenceInNights(checkIn, checkOut);

  if (!Number.isInteger(nights) || nights < 1) {
    return "Check-out must be later than check-in.";
  }

  if (nights > 30) {
    return "The maximum stay is 30 nights.";
  }

  if (!Number.isSafeInteger(guests) || guests < 1) {
    return "Please enter at least one guest.";
  }

  return "";
}

export default function AvailabilitySearch() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestRef = useRef(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  function clearPreviousSearch() {
    requestRef.current?.abort();
    requestRef.current = null;
    setResults(null);
    setError("");
    setLoading(false);
  }

  async function handleSearch(event) {
    event.preventDefault();

    clearPreviousSearch();

    const search = { checkIn, checkOut, guests };
    const validationError = validateSearch(search);

    if (validationError) {
      setError(validationError);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);

    try {
      const data = await searchAvailability(
        search,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setResults(data);
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(
          requestError.response?.data?.message
            ? "Unable to complete the search. Please check your dates and try again."
            : "Could not load availability. Please try again.",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  }

  return (
    <section
      className="availability-search"
      aria-labelledby="availability-heading"
    >
      <h2 id="availability-heading">
        Find Your Perfect Stay
      </h2>

      <p>
        Choose your dates and number of guests to
        check available rooms.
      </p>

      <form onSubmit={handleSearch}>
        <div className="availability-fields">
          <label>
            Check-in
            <input
              type="date"
              value={checkIn}
              min={getPhilippineToday()}
              required
              onChange={(event) => {
                clearPreviousSearch();
                setCheckIn(event.target.value);
              }}
            />
          </label>

          <label>
            Check-out
            <input
              type="date"
              value={checkOut}
              min={checkIn || getPhilippineToday()}
              required
              onChange={(event) => {
                clearPreviousSearch();
                setCheckOut(event.target.value);
              }}
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
              onChange={(event) => {
                clearPreviousSearch();
                setGuests(Number(event.target.value));
              }}
            />
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Available Rooms"}
        </button>
      </form>

      {error && (
        <p className="availability-error" role="alert">
          {error}
        </p>
      )}

      <div aria-live="polite" aria-busy={loading}>
        {loading && <p>Checking room availability...</p>}

        {results !== null && (
          <div className="availability-results">
            <h3>Search Results</h3>

            {results.length === 0 && (
              <p>
                No room types match your search.
                Try another guest count or date range.
              </p>
            )}

            {results.map((room) => (
              <article
                key={room.id}
                className="availability-result"
              >
                <div className="availability-result-header">
                  <h4>{room.name}</h4>

                  <span>
                    {room.available
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </div>

                <p>Maximum {room.capacity} guests</p>

                <p>
                  {formatCentavos(room.nightlyRateCentavos)}
                  {" / night"}
                </p>

                <p>
                  {room.nights}{" "}
                  {room.nights === 1 ? "night" : "nights"}
                </p>

                <strong>
                  Total:{" "}
                  {formatCentavos(room.totalAmountCentavos)}
                </strong>

                {room.available ? (
                  <Link to={`/rooms/${room.id}`}>
                    View Room Details
                  </Link>
                ) : (
                  <p>This room type is unavailable for these dates.</p>
                )}
              </article>
            ))}

            <p className="availability-note">
              Availability and prices are informational.
              A room is not reserved until a booking is
              successfully created and confirmed.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
