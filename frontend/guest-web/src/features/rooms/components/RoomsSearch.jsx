import { BedDouble, Search } from "lucide-react";
import RentalStayFields from "../../../shared/components/RentalStayFields.jsx";
import useRoomsSearch from "../hooks/useRoomsSearch.js";
import { RoomCatalog } from "./RoomCatalog.jsx";
import { AvailabilityResults } from "./AvailabilityResults.jsx";

export function RoomsSearch({
  query,
  search,
  metadata,
  onApply,
  onClear,
}) {
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
      <section
        className="availability-search rooms-searchbar"
        aria-labelledby="availability-title"
      >
        <header className="rooms-searchbar__heading">
          <span className="rooms-searchbar__icon">
            <BedDouble size={27} aria-hidden="true" />
          </span>

          <div>
            <h2 id="availability-title">Find Your Stay</h2>
            <p>
              Check availability and compare the full price for your stay.
            </p>
          </div>
        </header>

        <form
          ref={formRef}
          className="availability-form rooms-searchbar__form"
          onSubmit={submit}
          noValidate
        >
          <RentalStayFields
            values={values}
            errors={errors}
            onChange={changeField}
            prefix="rooms"
          />

          <div className="rooms-directory__search-actions">
            <button
              className="availability-button"
              type="submit"
              disabled={searchingCurrentDraft}
            >
              <Search size={18} aria-hidden="true" />
              {searchingCurrentDraft
                ? "Searching…"
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

          {Object.keys(errors).length > 0 && (
            <p className="availability-error" role="alert">
              Check the highlighted search fields.
            </p>
          )}
        </form>

        <p className="rooms-directory__search-help">
          Maximum stay: 30 days. Hourly stays must finish by 11 PM.
          Times use Philippine time.
        </p>
      </section>

      <div className="rooms-directory__content">
        {!query && <RoomCatalog metadata={metadata} />}

        {query && availability.status === "loading" && (
          <section
            className="rooms-directory__feedback"
            aria-labelledby="rooms-loading-title"
            aria-busy="true"
          >
            <h2 id="rooms-loading-title">Search Results</h2>
            <p role="status">Checking room availability…</p>
          </section>
        )}

        {query && availability.status === "error" && (
          <section
            className="rooms-directory__feedback"
            aria-labelledby="rooms-error-title"
          >
            <h2 id="rooms-error-title">
              Availability could not be loaded
            </h2>

            <p role="alert">
              Your applied stay remains selected. Try again.
            </p>

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