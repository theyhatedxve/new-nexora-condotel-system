import { Link } from "react-router";
import { Users } from "lucide-react";

import { toApiUrl } from "../services/api.js";
import { formatPesos } from "../utils/formatMoney.js";

function RoomCard({ room }) {
  const { id, name, description, capacity, baseRateCentavos, image } = room;

  return (
    <article className="room-card">
      {image ? (
        <img
          className="room-card-image"
          src={toApiUrl(image.url)}
          alt={image.altText || `${name} room`}
          loading="lazy"
        />
      ) : (
        <div className="room-card-image room-card-placeholder">
          Photo coming soon
        </div>
      )}

      <div className="room-card-body">
        <h2>{name}</h2>

        {description && (
          <p className="room-card-description">{description}</p>
        )}

        <p className="room-card-capacity">
          <Users size={18} aria-hidden="true" />
          Up to {capacity} {capacity === 1 ? "guest" : "guests"}
        </p>

        <p className="room-card-price">
          <strong>{formatPesos(baseRateCentavos)}</strong> per night
        </p>

        <Link to={`/rooms/${id}`} className="outline-button">
          View details
          <span className="visually-hidden"> for {name}</span>
        </Link>
      </div>
    </article>
  );
}

export default RoomCard;