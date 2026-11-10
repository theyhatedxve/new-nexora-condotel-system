import { getPhilippineToday, MAX_GUESTS } from "../../utils/staySearch.js";
import useRoomsSearch from "../../hooks/useRoomsSearch.js";
import { RoomCatalog } from "./RoomCatalog.jsx";
import { AvailabilityResults } from "./AvailabilityResults.jsx";

export function RoomsSearch({ query, search, metadata, onApply, onClear }) {
  const {
    formRef,
    values,
    errors,
    retryAvailability,
    availability,
    searchingCurrentDraft,
    changeField,
    submit,
  } = useRoomsSearch({ query, search, onApply });

  return (
    <div className="rooms-directory__layout">
      <aside className="rooms-directory__sidebar" aria-labelledby="availability-title">
        <section className="availability-search">
          <h2 id="availability-title">Search your stay</h2>

          <p className="availability-description">
            Choose your dates and guests to check availability.
          </p>

          <form ref={formRef} className="availability-form" onSubmit={submit} noValidate>
            <div className="availability-fields">
              <div className="availability-field">
                <label htmlFor="check-in">Check-in</label>

                <input
                  id="check-in"
                  name="checkIn"
                  type="date"
                  required
                  min={getPhilippineToday()}
                  value={values.checkIn}
                  aria-invalid={Boolean(errors.checkIn)}
                  aria-describedby={errors.checkIn ? "rooms-check-in-error" : undefined}
                  onChange={(event) => changeField("checkIn", event.target.value)}
                />

                {errors.checkIn && (
                  <p id="rooms-check-in-error" className="availability-error">
                    {errors.checkIn}
                  </p>
                )}
              </div>

              <div className="availability-field">
                <label htmlFor="check-out">Check-out</label>

                <input
                  id="check-out"
                  name="checkOut"
                  type="date"
                  required
                  min={values.checkIn || getPhilippineToday()}
                  value={values.checkOut}
                  aria-invalid={Boolean(errors.checkOut)}
                  aria-describedby={errors.checkOut ? "rooms-check-out-error" : undefined}
                  onChange={(event) => changeField("checkOut", event.target.value)}
                />

                {errors.checkOut && (
                  <p id="rooms-check-out-error" className="availability-error">
                    {errors.checkOut}
                  </p>
                )}
              </div>

              <div className="availability-field">
                <label htmlFor="guest-count">Guests</label>

                <input
                  id="guest-count"
                  name="guests"
                  type="number"
                  required
                  min={1}
                  max={MAX_GUESTS}
                  step={1}
                  value={values.guests}
                  aria-invalid={Boolean(errors.guests)}
                  aria-describedby={errors.guests ? "rooms-guests-error" : undefined}
                  onChange={(event) => changeField("guests", event.target.value)}
                />

                {errors.guests && (
                  <p id="rooms-guests-error" className="availability-error">
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
                {searchingCurrentDraft ? "Searching..." : "Search Available Rooms"}
              </button>

              {query && (
                <button className="outline-button" type="button" onClick={onClear}>
                  Clear stay search
                </button>
              )}
            </div>
          </form>

          {Object.keys(errors).length > 0 && (
            <p className="availability-error" role="alert">
              Check the highlighted search fields.
            </p>
          )}

          <p className="rooms-directory__search-help">
            Maximum stay: 30 nights. Searching does not reserve a room.
          </p>
        </section>
      </aside>

      <div className="rooms-directory__content">
        {!query && <RoomCatalog metadata={metadata} />}

        {query && availability.status === "loading" && (
          <section
            className="rooms-directory__feedback"
            aria-labelledby="rooms-loading-title"
            aria-busy="true"
          >
            <h2 id="rooms-loading-title">Search Results</h2>

            <p role="status">Checking room availability...</p>

            <p>
              {query.checkIn} to {query.checkOut}, {query.guests}{" "}
              {query.guests === 1 ? "guest" : "guests"}.
            </p>
          </section>
        )}

        {query && availability.status === "error" && (
          <section
            className="rooms-directory__feedback"
            aria-labelledby="rooms-error-title"
          >
            <h2 id="rooms-error-title">Availability could not be loaded</h2>

            <p role="alert">Your applied dates remain selected. Try the search again.</p>

            <button
              type="button"
              className="feedback-retry-button"
              onClick={retryAvailability}
            >
              Retry availability
            </button>
          </section>
        )}

        {query && availability.status === "success" && (
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
