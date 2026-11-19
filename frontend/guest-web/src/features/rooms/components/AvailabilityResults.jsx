import { Link } from "react-router";
import { ArrowRight, BedDouble, Users } from "lucide-react";
import RentalDetails from "../../../shared/components/RentalDetails.jsx";
import RoomAmenities from "./RoomAmenities.jsx";
import RoomBrowser from "./RoomBrowser.jsx";
import useRoomCard from "../hooks/useRoomCard.js";
import { availabilitySummary } from "../utils/availabilitySummary.js";
import { toApiUrl } from "../../../shared/services/api.js";
import { formatPesos } from "../../../shared/utils/formatMoney.js";

function AvailabilityRoomCard({
  result,
  roomDetails,
  checkoutSearch,
}) {
  const { image, imageUnavailable, handleImageError } = useRoomCard({
    room: { ...result, image: roomDetails?.image },
  });

  const roomId = encodeURIComponent(result.id);

  return (
    <article className="availability-result-card">
      <div className="room-card-media">
        {image?.url && !imageUnavailable ? (
          <img
            className="room-card-image"
            src={toApiUrl(image.url)}
            alt={image.altText || `${result.name} room`}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div className="room-card-image room-card-placeholder">
            <BedDouble size={34} aria-hidden="true" />
            <span>
              {imageUnavailable
                ? "Photo unavailable"
                : "Photo coming soon"}
            </span>
          </div>
        )}
      </div>

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

        <p className="room-card-capacity">
          <Users size={18} aria-hidden="true" />
          Up to {result.capacity}{" "}
          {result.capacity === 1 ? "guest" : "guests"}
        </p>

        <RoomAmenities room={roomDetails} />

        {result.rentalType ? (
          <dl className="rental-summary">
            <RentalDetails value={result} />
          </dl>
        ) : (
          <p>
            {result.nights} nights ·{" "}
            {formatPesos(result.nightlyRateCentavos)} per night
          </p>
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
              View Details
              <ArrowRight size={17} aria-hidden="true" />
            </Link>

            <Link
              className="rooms-booking-button"
              to={`/checkout/${roomId}?${checkoutSearch}`}
            >
              Continue to booking
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="availability-unavailable">
            Not available for this stay.
          </p>
        )}
      </div>
    </article>
  );
}

export function AvailabilityResults({ query, results, rooms }) {
  const { availableCount, checkoutSearch } = availabilitySummary(
    results,
    query,
  );

  return (
    <section
      className="availability-results"
      aria-labelledby="search-results-title"
    >
      <h2 id="search-results-title">Search Results</h2>

      <p className="availability-summary">
        Applied stay: {query.checkIn} to {query.checkOut},{" "}
        {query.guests} {query.guests === 1 ? "guest" : "guests"}.
      </p>

      <p className="availability-summary" role="status">
        {availableCount} available room{" "}
        {availableCount === 1 ? "type" : "types"} for this stay.
      </p>

      {results.length === 0 && (
        <p className="rooms-message">
          No room types offer this stay. Try another rental type,
          date, or guest count.
        </p>
      )}

      {results.length > 0 && availableCount === 0 && (
        <p className="rooms-message">
          Matching room types exist, but none are available.
        </p>
      )}

      {results.length > 0 && (
        <RoomBrowser
          headingId="stay-room-options-title"
          headingLevel={3}
          title="Room options for your stay"
          description="Filter these results or compare their full stay prices."
          items={results}
          priceKey="totalAmountCentavos"
          priceLabel="Total stay price"
          renderRoom={(result) => (
            <AvailabilityRoomCard
              result={result}
              roomDetails={rooms.find((room) => room.id === result.id)}
              checkoutSearch={checkoutSearch}
            />
          )}
        />
      )}

      <p className="availability-disclaimer">
        Prices and availability are calculated by NEXORA&apos;s backend.
        Searching does not reserve a room.
      </p>
    </section>
  );
}