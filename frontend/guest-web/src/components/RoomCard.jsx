import { useState } from "react";
import { Link } from "react-router";

import {
  ArrowRight,
  BedDouble,
  Users,
} from "lucide-react";

import {
  toApiUrl,
} from "../services/api.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

function RoomCard({ room }) {
  const [failedImageUrl, setFailedImageUrl] =
    useState(null);

  const {
    id,
    name,
    description,
    capacity,
    baseRateCentavos,
    image,
  } = room;

  const imageUnavailable =
    image?.url &&
    failedImageUrl === image.url;

  return (
    <article className="room-card">
      <div className="room-card-media">
        {image?.url && !imageUnavailable ? (
          <img
            className="room-card-image"
            src={toApiUrl(image.url)}
            alt={
              image.altText ||
              `${name} room`
            }
            loading="lazy"
            decoding="async"
            onError={() =>
              setFailedImageUrl(image.url)
            }
          />
        ) : (
          <div className="room-card-image room-card-placeholder">
            <BedDouble
              size={34}
              aria-hidden="true"
            />

            <span>
              {imageUnavailable
                ? "Photo unavailable"
                : "Photo coming soon"}
            </span>
          </div>
        )}
      </div>

      <div className="room-card-body">
        <div className="room-card-information">
          <h3>{name}</h3>

          {description && (
            <p className="room-card-description">
              {description}
            </p>
          )}

          <p className="room-card-capacity">
            <Users
              size={18}
              aria-hidden="true"
            />

            <span>
              Up to {capacity}{" "}
              {capacity === 1
                ? "guest"
                : "guests"}
            </span>
          </p>
        </div>

        <div className="room-card-actions">
          <p className="room-card-price">
            <strong>
              {formatPesos(baseRateCentavos)}
            </strong>
            <span>per night</span>
          </p>

          <Link
            to={`/rooms/${encodeURIComponent(id)}`}
            className="outline-button"
          >
            View Details
            <ArrowRight
              size={17}
              aria-hidden="true"
            />

            <span className="visually-hidden">
              {" "}for {name}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default RoomCard;