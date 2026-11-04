import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import RoomCard from "../components/RoomCard";

import {
  useRoomTypes,
} from "../hooks/useRoomTypes";

import {
  searchAvailability,
} from "../services/availabilityApi.js";

import {
  toApiUrl,
} from "../services/api.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import {
  getPhilippineToday,
  MAX_GUESTS,
  parseStaySearch,
  stayNights,
  staySearchParams,
  validateStaySearch,
} from "../utils/staySearch.js";

import "../styles/rooms-listing.css";

import "../styles/availability.css";

function validateResults(results, query) {
  const expectedNights = stayNights(
    query.checkIn,
    query.checkOut,
  );

  const ids = new Set();

  for (const result of results) {
    if (
      !result ||
      typeof result.id !== "string" ||
      !result.id ||
      typeof result.name !== "string" ||
      !result.name ||
      typeof result.available !== "boolean" ||
      !Number.isSafeInteger(result.capacity) ||
      result.capacity < 1 ||
      !Number.isSafeInteger(
        result.nightlyRateCentavos,
      ) ||
      result.nightlyRateCentavos < 0 ||
      !Number.isSafeInteger(
        result.totalAmountCentavos,
      ) ||
      result.totalAmountCentavos < 0 ||
      result.nights !== expectedNights ||
      ids.has(result.id)
    ) {
      throw new Error(
        "Invalid availability response.",
      );
    }

    ids.add(result.id);
  }

  return results;
}

function useAvailability(query, revision) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const results = await searchAvailability(
          query,
          controller.signal,
        );

        if (!active) return;

        setState({
          query,
          revision,
          status: "success",
          results: validateResults(
            results,
            query,
          ),
        });
      } catch {
        if (!active) return;

        setState({
          query,
          revision,
          status: "error",
          results: [],
        });
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, revision]);

  if (!query) {
    return {
      status: "idle",
      results: [],
    };
  }

  if (
    state?.query !== query ||
    state.revision !== revision
  ) {
    return {
      status: "loading",
      results: [],
    };
  }

  return state;
}

function RoomCatalog({ metadata }) {
  const { status, rooms, retry } = metadata;

  return (
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
          <h3>Unable to load rooms</h3>

          <p>
            We could not retrieve the room listings.
            Please try again.
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

      {status === "success" &&
        rooms.length === 0 && (
          <div
            className="guest-feedback"
            role="status"
          >
            <h3>No rooms to display</h3>

            <p>
              There are currently no room types
              listed. Please check again later.
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

      {status === "success" &&
        rooms.length > 0 && (
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
  );
}

function AvailabilityResults({
  query,
  results,
  rooms,
}) {
  const availableCount = results.filter(
    (room) => room.available,
  ).length;

  const checkoutSearch =
    staySearchParams(query);

  return (
    <section
      className="availability-results"
      aria-labelledby="search-results-title"
    >
      <h2 id="search-results-title">
        Search Results
      </h2>

      <p className="availability-summary">
        Applied stay: {query.checkIn} to{" "}
        {query.checkOut}, {query.guests}{" "}
        {query.guests === 1 ? "guest" : "guests"}.
      </p>

      <p
        className="availability-summary"
        role="status"
      >
        {availableCount} available room{" "}
        {availableCount === 1 ? "type" : "types"}
        {" "}for these dates.
      </p>

      {results.length === 0 && (
        <p className="rooms-message">
          No room types match this search.
          Try changing the dates or guest count.
        </p>
      )}

      {results.length > 0 &&
        availableCount === 0 && (
          <p className="rooms-message">
            Matching room types exist, but none
            are available for these dates.
          </p>
        )}

      {results.length > 0 && (
        <div className="availability-results-grid">
          {results.map((result) => {
            const roomDetails = rooms.find(
              (room) => room.id === result.id,
            );

            const roomId = encodeURIComponent(
              result.id,
            );

            return (
              <article
                key={result.id}
                className="availability-result-card"
              >
                {roomDetails?.image ? (
                  <img
                    className="room-card-image"
                    src={toApiUrl(
                      roomDetails.image.url,
                    )}
                    alt={
                      roomDetails.image.altText ||
                      `${result.name} room`
                    }
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
                      {result.available
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </div>

                  <p>
                    Up to {result.capacity}{" "}
                    {result.capacity === 1
                      ? "guest"
                      : "guests"}
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
                        Book — Pay at Property
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
        These are informational availability
        results. Prices are calculated by
        NEXORA&apos;s backend. Searching does not
        reserve a room.
      </p>
    </section>
  );
}

function RoomsSearch({
  query,
  search,
  metadata,
  onApply,
  onClear,
}) {
  const formRef = useRef(null);

  const [values, setValues] = useState(() => ({
    checkIn: query?.checkIn ?? "",
    checkOut: query?.checkOut ?? "",
    guests: String(query?.guests ?? 2),
  }));

  const [errors, setErrors] = useState({});
  const [revision, setRevision] = useState(0);

  const availability = useAvailability(
    query,
    revision,
  );

  const draftMatchesApplied =
    query !== null &&
    values.checkIn === query.checkIn &&
    values.checkOut === query.checkOut &&
    Number(values.guests) === query.guests;

  const searchingCurrentDraft =
    availability.status === "loading" &&
    draftMatchesApplied;

  function changeField(field, value) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors({});
  }

  function submit(event) {
    event.preventDefault();

    const checked = validateStaySearch(values);
    setErrors(checked.errors);

    if (!checked.value) {
      const firstField =
        Object.keys(checked.errors)[0];

      formRef.current?.elements
        .namedItem(firstField)
        ?.focus();

      return;
    }

    const nextSearch = staySearchParams(
      checked.value,
    );

    if (nextSearch === search) {
      if (availability.status !== "loading") {
        setRevision((value) => value + 1);
      }

      return;
    }

    onApply(nextSearch);
  }

  return (
    <div className="rooms-directory__layout">
      <aside
        className="rooms-directory__sidebar"
        aria-labelledby="availability-title"
      >
        <section className="availability-search">
          <h2 id="availability-title">
            Search your stay
          </h2>

          <p className="availability-description">
            Choose your dates and guests to
            check availability.
          </p>

          <form
            ref={formRef}
            className="availability-form"
            onSubmit={submit}
            noValidate
          >
            <div className="availability-fields">
              <div className="availability-field">
                <label htmlFor="check-in">
                  Check-in
                </label>

                <input
                  id="check-in"
                  name="checkIn"
                  type="date"
                  required
                  min={getPhilippineToday()}
                  value={values.checkIn}
                  aria-invalid={Boolean(
                    errors.checkIn,
                  )}
                  aria-describedby={
                    errors.checkIn
                      ? "rooms-check-in-error"
                      : undefined
                  }
                  onChange={(event) =>
                    changeField(
                      "checkIn",
                      event.target.value,
                    )
                  }
                />

                {errors.checkIn && (
                  <p
                    id="rooms-check-in-error"
                    className="availability-error"
                  >
                    {errors.checkIn}
                  </p>
                )}
              </div>

              <div className="availability-field">
                <label htmlFor="check-out">
                  Check-out
                </label>

                <input
                  id="check-out"
                  name="checkOut"
                  type="date"
                  required
                  min={
                    values.checkIn ||
                    getPhilippineToday()
                  }
                  value={values.checkOut}
                  aria-invalid={Boolean(
                    errors.checkOut,
                  )}
                  aria-describedby={
                    errors.checkOut
                      ? "rooms-check-out-error"
                      : undefined
                  }
                  onChange={(event) =>
                    changeField(
                      "checkOut",
                      event.target.value,
                    )
                  }
                />

                {errors.checkOut && (
                  <p
                    id="rooms-check-out-error"
                    className="availability-error"
                  >
                    {errors.checkOut}
                  </p>
                )}
              </div>

              <div className="availability-field">
                <label htmlFor="guest-count">
                  Guests
                </label>

                <input
                  id="guest-count"
                  name="guests"
                  type="number"
                  required
                  min={1}
                  max={MAX_GUESTS}
                  step={1}
                  value={values.guests}
                  aria-invalid={Boolean(
                    errors.guests,
                  )}
                  aria-describedby={
                    errors.guests
                      ? "rooms-guests-error"
                      : undefined
                  }
                  onChange={(event) =>
                    changeField(
                      "guests",
                      event.target.value,
                    )
                  }
                />

                {errors.guests && (
                  <p
                    id="rooms-guests-error"
                    className="availability-error"
                  >
                    {errors.guests}
                  </p>
                )}
              </div>
            </div>

            <div className="rooms-directory__search-actions">
              <button
                className="availability-button"
                type="submit"
                disabled={searchingCurrentDraft}
              >
                {searchingCurrentDraft
                  ? "Searching..."
                  : "Search Available Rooms"}
              </button>

              {query && (
                <button
                  className="outline-button"
                  type="button"
                  onClick={onClear}
                >
                  Clear stay search
                </button>
              )}
            </div>
          </form>

          {Object.keys(errors).length > 0 && (
            <p
              className="availability-error"
              role="alert"
            >
              Check the highlighted search fields.
            </p>
          )}

          <p className="rooms-directory__search-help">
            Maximum stay: 30 nights.
            Searching does not reserve a room.
          </p>
        </section>
      </aside>

      <div className="rooms-directory__content">
        {!query && (
          <RoomCatalog metadata={metadata} />
        )}

        {query &&
          availability.status === "loading" && (
            <section
              className="rooms-directory__feedback"
              aria-labelledby="rooms-loading-title"
              aria-busy="true"
            >
              <h2 id="rooms-loading-title">
                Search Results
              </h2>

              <p role="status">
                Checking room availability...
              </p>

              <p>
                {query.checkIn} to{" "}
                {query.checkOut}, {query.guests}{" "}
                {query.guests === 1
                  ? "guest"
                  : "guests"}.
              </p>
            </section>
          )}

        {query &&
          availability.status === "error" && (
            <section
              className="rooms-directory__feedback"
              aria-labelledby="rooms-error-title"
            >
              <h2 id="rooms-error-title">
                Availability could not be loaded
              </h2>

              <p role="alert">
                Your applied dates remain
                selected. Try the search again.
              </p>

              <button
                type="button"
                className="feedback-retry-button"
                onClick={() =>
                  setRevision(
                    (value) => value + 1,
                  )
                }
              >
                Retry availability
              </button>
            </section>
          )}

        {query &&
          availability.status === "success" && (
            <AvailabilityResults
              query={query}
              results={availability.results}
              rooms={metadata.rooms}
            />
          )}
      </div>
    </div>
  );
}

function Rooms() {
  const metadata = useRoomTypes();

  const [params, setParams] =
    useSearchParams();

  const search = params.toString();
  const today = getPhilippineToday();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseStaySearch(search, today),
        error: "",
      };
    } catch (error) {
      return {
        query: null,
        error:
          error instanceof Error
            ? error.message
            : "The stay-search URL is invalid.",
      };
    }
  }, [search, today]);

  return (
    <main className="rooms-page rooms-directory">
      <h1>Our Rooms</h1>

      <p className="rooms-intro">
        {status === "success"
          ? `${rooms.length} room ${
              rooms.length === 1 ? "type" : "types"
            } listed. `
          : ""}
        Rates shown are per night.
      </p>

      {parsed.error ? (
        <div
          className="guest-feedback"
          role="alert"
        >
          <h2>Check your search</h2>

          <p>{parsed.error}</p>

          <button
            type="button"
            className="feedback-retry-button"
            onClick={() =>
              setParams(
                "",
                { replace: true },
              )
            }
          >
            Clear invalid search
          </button>
        </div>
      ) : (
        <RoomsSearch
          key={search}
          query={parsed.query}
          search={search}
          metadata={metadata}
          onApply={(nextSearch) =>
            setParams(nextSearch)
          }
          onClear={() => setParams("")}
        />
      )}
    </main>
  );
}

export default Rooms;