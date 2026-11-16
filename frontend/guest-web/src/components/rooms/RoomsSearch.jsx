import RentalStayFields from "../RentalStayFields.jsx";
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
            <RentalStayFields values={values} errors={errors} onChange={changeField} prefix="rooms" />

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
            Maximum stay: 30 days. Hourly stays must finish by 11 PM.
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
