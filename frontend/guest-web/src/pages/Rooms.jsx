
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import RoomCard from "../components/RoomCard";
import { useRoomTypes } from "../hooks/useRoomTypes";
import { searchAvailability } from "../services/availabilityApi.js";
import { formatPesos } from "../utils/formatMoney.js";

import { toApiUrl } from "../services/api.js";

import "../styles/availability.css";

// Get today's date using the property's Philippine timezone.
function getTodayInPhilippines() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getValue = (type) =>
    parts.find((part) => part.type === type)?.value;

  return [
    getValue("year"),
    getValue("month"),
    getValue("day"),
  ].join("-");
}

// Date-only calculation, without local timezone conversions.
function calculateNights(checkIn, checkOut) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);

  return (end - start) / 86400000;
}

function validateSearch(checkIn, checkOut, guests) {
  if (!checkIn || !checkOut) {
    return "Please select your check-in and check-out dates.";
  }

  if (checkIn < getTodayInPhilippines()) {
    return "Check-in cannot be in the past.";
  }

  const nights = calculateNights(checkIn, checkOut);

  if (!Number.isInteger(nights) || nights < 1) {
    return "Check-out must be later than check-in.";
  }

  if (nights > 30) {
    return "A stay cannot exceed 30 nights.";
  }

  if (!Number.isSafeInteger(guests) || guests < 1) {
    return "Please enter a valid number of guests.";
  }

  if (guests > 2147483647) {
    return "The number of guests is too large.";
  }

  return "";
}

function Rooms() {
  // Existing room metadata and images.
  const { status, rooms, retry } = useRoomTypes();

  // Search input values.
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  // Search request state.
  const [availabilityStatus, setAvailabilityStatus] =
    useState("idle");
  const [availabilityResults, setAvailabilityResults] =
    useState([]);
  const [searchError, setSearchError] = useState("");

  const requestRef = useRef(null);

  // Cancel an outstanding request when leaving the page.
  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  // Reset stale results whenever guests change their search.
  function resetSearch() {
    requestRef.current?.abort();
    requestRef.current = null;

    setAvailabilityStatus("idle");
    setAvailabilityResults([]);
    setSearchError("");
  }

  async function handleSearch(event) {
    event.preventDefault();

    resetSearch();

    const error = validateSearch(
      checkIn,
      checkOut,
      guests,
    );

    if (error) {
      setSearchError(error);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setAvailabilityStatus("loading");

    try {
      const results = await searchAvailability(
        {
          checkIn,
          checkOut,
          guests,
        },
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      setAvailabilityResults(results);
      setAvailabilityStatus("success");
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("Availability search failed:", error);

      setSearchError(
        "Unable to check room availability. Please try again.",
      );
      setAvailabilityStatus("error");
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    }
  }

  const hasSearched = availabilityStatus === "success";

  const availableCount = availabilityResults.filter(
    (room) => room.available,
  ).length;

  return (
    <main className="rooms-page">
      <h1>Our Rooms</h1>

      <p className="rooms-intro">
        Explore our rooms and find your perfect stay.
      </p>

      {/* STEP 4: DATE AND CAPACITY SEARCH */}
      <section
        className="availability-search"
        aria-labelledby="availability-title"
      >
        <h2 id="availability-title">
          Search Available Rooms
        </h2>

        <p className="availability-description">
          Select your preferred dates and number of guests.
        </p>

        <form
          className="availability-form"
          onSubmit={handleSearch}
        >
          <div className="availability-fields">
            <div className="availability-field">
              <label htmlFor="check-in">
                Check-in
              </label>

              <input
                id="check-in"
                type="date"
                value={checkIn}
                min={getTodayInPhilippines()}
                required
                onChange={(event) => {
                  resetSearch();
                  setCheckIn(event.target.value);
                }}
              />
            </div>

            <div className="availability-field">
              <label htmlFor="check-out">
                Check-out
              </label>

              <input
                id="check-out"
                type="date"
                value={checkOut}
                min={checkIn || getTodayInPhilippines()}
                required
                onChange={(event) => {
                  resetSearch();
                  setCheckOut(event.target.value);
                }}
              />
            </div>

            <div className="availability-field">
              <label htmlFor="guest-count">
                Guests
              </label>

              <input
                id="guest-count"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                value={guests}
                required
                onChange={(event) => {
                  resetSearch();
                  setGuests(Number(event.target.value));
                }}
              />
            </div>
          </div>

          <button
            className="availability-button"
            type="submit"
            disabled={availabilityStatus === "loading"}
          >
            {availabilityStatus === "loading"
              ? "Searching..."
              : "Search Available Rooms"}
          </button>
        </form>

        {searchError && (
          <p className="availability-error" role="alert">
            {searchError}
          </p>
        )}

        {availabilityStatus === "loading" && (
          <p className="rooms-message" role="status">
            Checking room availability...
          </p>
        )}
      </section>

      {/* BEFORE SEARCH: EXISTING ROOM LISTING */}
      {!hasSearched && (
        <section aria-labelledby="all-rooms-title">
          <h2
            id="all-rooms-title"
            className="availability-section-title"
          >
            Explore Our Rooms
          </h2>

          <p className="rooms-intro">
            Rates shown are per night.
          </p>

          {status === "loading" && (
            <p className="rooms-message" role="status">
              Loading rooms...
            </p>
          )}

          
          {status === "error" && (
            <div className="guest-feedback" role="alert">
              <h2>Unable to load rooms</h2>

              <p>
                We couldn't retrieve the room listings.
                Please check your connection and try again.
              </p>

              <button
                type="button"
                className="feedback-retry-button"
                onClick={retry}
              >
                Try Again
              </button>
            </div>
          )}


          
          {status === "success" && rooms.length === 0 && (
            <div className="guest-feedback" role="status">
              <h2>No rooms to display</h2>

              <p>
                There are currently no room types listed.
                Please check again later.
              </p>

              <button
                type="button"
                className="feedback-retry-button"
                onClick={retry}
              >
                Refresh Rooms
              </button>
            </div>
          )}


          {status === "success" && rooms.length > 0 && (
            <div className="room-grid">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 5: BACKEND-CALCULATED SEARCH RESULTS */}
      {hasSearched && (
        <section
          className="availability-results"
          aria-labelledby="search-results-title"
        >
          <h2 id="search-results-title">
            Search Results
          </h2>

          <p className="availability-summary" role="status">
            {availableCount} available room{" "}
            {availableCount === 1 ? "type" : "types"}
            {" "}for your selected dates.
          </p>

          {availabilityResults.length === 0 && (
            <p className="rooms-message">
              No room types match your search.
              Try changing the number of guests or dates.
            </p>
          )}

          {availabilityResults.length > 0 && (
            <div className="availability-results-grid">
              {availabilityResults.map((result) => {
                // Reuse existing room image and description
                // when room metadata has loaded successfully.
                const roomDetails = rooms.find(
                  (room) => room.id === result.id,
                );

                return (
                  <article
                    key={result.id}
                    className="availability-result-card"
                  >
                    {roomDetails?.image && (
                      <img
                        className="room-card-image"
                        src={toApiUrl(roomDetails.image.url)}
                        alt={
                          roomDetails.image.altText ||
                          `${result.name} room`
                        }
                        loading="lazy"
                      />
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
                          {result.available
                            ? "Available"
                            : "Unavailable"}
                        </span>
                      </div>

                      <p>
                        Up to {result.capacity} guests
                      </p>

                      <p>
                        <strong>
                          {formatPesos(
                            result.nightlyRateCentavos,
                          )}
                        </strong>
                        {" "}per night
                      </p>

                      <p>
                        {result.nights}{" "}
                        {result.nights === 1
                          ? "night"
                          : "nights"}
                      </p>

                      <div className="availability-total">
                        <span>Total stay price</span>

                        <strong>
                          {formatPesos(
                            result.totalAmountCentavos,
                          )}
                        </strong>
                      </div>

                      {result.available ? (
                        <Link
                          className="outline-button"
                          to={`/rooms/${result.id}`}
                        >
                          View Room Details
                        </Link>
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
            These are informational availability results.
            Prices are calculated by NEXORA's backend.
            Searching does not reserve a room.
          </p>
        </section>
      )}
    </main>
  );
}

export default Rooms;
