import { Link, useParams } from "react-router";
import { Check, Users } from "lucide-react";

import { useRoomDetails } from "../hooks/useRoomDetails";
import { toApiUrl } from "../services/api.js";
import { formatPesos } from "../utils/formatMoney.js";

function BackLink() {
  return (
    <Link to="/rooms" className="back-link">
      ← Back to rooms
    </Link>
  );
}

function RoomDetails() {
  const { id } = useParams();
  const { status, room, images, amenities, retry } = useRoomDetails(id);

  if (status === "loading") {
    return (
      <main className="room-details">
        <p className="rooms-message" role="status">
          Loading room...
        </p>
      </main>
    );
  }

  if (status === "notFound") {
    return (
      <main className="room-details">
        <BackLink />
        <h1>Room not found</h1>
        <p className="rooms-message">
          This room is not available. Please choose another room.
        </p>
      </main>
    );
  }

  
    if (status === "error") {
    return (
        <main className="room-details">
        <BackLink />

        <div className="guest-feedback" role="alert">
            <h1>Room details unavailable</h1>

            <p>
            We couldn't load this room's information.
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
        </main>
    );
    }


  return (
    <main className="room-details">
      <BackLink />

      <h1>{room.name}</h1>

      <p className="room-details-meta">
        <Users size={18} aria-hidden="true" />
        Up to {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
      </p>

      <p className="room-card-price">
        <strong>{formatPesos(room.baseRateCentavos)}</strong> per night
      </p>

      {images.length > 0 ? (
        <div className="room-gallery">
          {images.map((image) => (
            <img
              key={image.id}
              src={toApiUrl(image.url)}
              alt={image.altText || `${room.name} room`}
            />
          ))}
        </div>
      ) : (
        <div className="room-card-image room-card-placeholder">
          Photos coming soon
        </div>
      )}

      {room.description && (
        <section aria-labelledby="about-title">
          <h2 id="about-title">About this room</h2>
          <p className="room-details-description">{room.description}</p>
        </section>
      )}

      <section aria-labelledby="amenities-title">
        <h2 id="amenities-title">Amenities</h2>

        {amenities.length > 0 ? (
          <ul className="amenity-list">
            {amenities.map((amenity) => (
              <li key={amenity.id}>
                <Check size={18} aria-hidden="true" />
                {amenity.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rooms-message">No amenities listed yet.</p>
        )}
      </section>
    </main>
  );
}

export default RoomDetails;