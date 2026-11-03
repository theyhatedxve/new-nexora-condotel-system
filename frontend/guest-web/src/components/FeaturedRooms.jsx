import { useState } from "react";
import { Link } from "react-router";

import {
  ArrowRight,
  BedDouble,
  Check,
  Users,
} from "lucide-react";

import {
  useFeaturedRooms,
} from "../hooks/useFeaturedRooms";

import {
  toApiUrl,
} from "../services/api.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import "./FeaturedRooms.css";

function FeaturedRoomImage({
  room,
  onRetry,
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const unavailable =
    room.imageStatus === "error" ||
    imageFailed;

  return (
    <div className="featured-room__media">
      {room.image && !unavailable ? (
        <img
          src={toApiUrl(room.image.url)}
          alt={
            room.image.altText ||
            `${room.name} room`
          }
          className="featured-room__image"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="featured-room__placeholder">
          <BedDouble
            size={36}
            aria-hidden="true"
          />

          <p>
            {unavailable
              ? "Photo unavailable"
              : "Photo coming soon"}
          </p>

          {unavailable && (
            <button
              type="button"
              className="featured-room__image-retry"
              onClick={onRetry}
              aria-label={`Retry room information for ${room.name}`}
            >
              Retry room information
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FeaturedRoomCard({
  room,
  onRetry,
}) {
  return (
    <article className="featured-room">
      <FeaturedRoomImage
        room={room}
        onRetry={onRetry}
      />

      <div className="featured-room__body">
        <h3 className="featured-room__name">
          {room.name}
        </h3>

        {room.description && (
          <p className="featured-room__description">
            {room.description}
          </p>
        )}

        <p className="featured-room__capacity">
          <Users
            size={18}
            aria-hidden="true"
          />

          <span>
            Up to {room.capacity}{" "}
            {room.capacity === 1
              ? "guest"
              : "guests"}
          </span>
        </p>

        {room.amenitiesStatus === "ready" ? (
          room.amenities.length > 0 ? (
            <ul
              className="featured-room__amenities"
              aria-label={`${room.name} amenities`}
            >
              {room.amenities.map((amenity) => (
                <li key={amenity.id}>
                  <Check
                    size={15}
                    aria-hidden="true"
                  />
                  {amenity.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="featured-room__note">
              No amenities listed yet.
            </p>
          )
        ) : (
          <p className="featured-room__note">
            Amenity information is unavailable.
          </p>
        )}

        <div className="featured-room__footer">
          <p className="featured-room__price">
            <strong>
              {formatPesos(
                room.baseRateCentavos,
              )}
            </strong>
            <span>per night</span>
          </p>

          <Link
            to={`/rooms/${encodeURIComponent(room.id)}`}
            className="featured-room__details"
          >
            View Details
            <ArrowRight
              size={17}
              aria-hidden="true"
            />
            <span className="visually-hidden">
              {" "}for {room.name}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function FeaturedRooms() {
  const {
    status,
    rooms,
    retry,
  } = useFeaturedRooms();

  const partialFailure =
    status === "success" &&
    rooms.some(
      (room) =>
        room.imageStatus === "error" ||
        room.amenitiesStatus === "error",
    );

  return (
    <section
      className="featured-rooms"
      aria-labelledby="featured-rooms-title"
    >
      <div className="featured-rooms__heading">
        <div>
          <p className="featured-rooms__eyebrow">
            Find your space
          </p>

          <h2 id="featured-rooms-title">
            Featured Rooms
          </h2>

          <p className="featured-rooms__intro">
            Explore our room types. Search your
            dates to check availability and the
            full stay price.
          </p>
        </div>

        <Link
          to="/rooms"
          className="featured-rooms__all"
        >
          View all rooms
          <ArrowRight
            size={18}
            aria-hidden="true"
          />
        </Link>
      </div>

      {status === "loading" && (
        <p
          className="featured-rooms__feedback"
          role="status"
        >
          Loading featured rooms...
        </p>
      )}

      {status === "error" && (
        <div className="featured-rooms__feedback">
          <p role="alert">
            Featured rooms could not be loaded.
            Please try again.
          </p>

          <button
            type="button"
            className="featured-rooms__retry"
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}

      {status === "success" &&
        rooms.length === 0 && (
          <div className="featured-rooms__feedback">
            <p role="status">
              No room types are currently listed.
              Please check again later.
            </p>

            <button
              type="button"
              className="featured-rooms__retry"
              onClick={retry}
            >
              Refresh rooms
            </button>
          </div>
        )}

      {partialFailure && (
        <div className="featured-rooms__feedback">
          <p role="status">
            Some photos or amenities could not
            be loaded. Available room information
            is shown below.
          </p>

          <button
            type="button"
            className="featured-rooms__retry"
            onClick={retry}
          >
            Retry room information
          </button>
        </div>
      )}

      {status === "success" &&
        rooms.length > 0 && (
          <div className="featured-rooms__grid">
            {rooms.map((room) => (
              <FeaturedRoomCard
                key={room.id}
                room={room}
                onRetry={retry}
              />
            ))}
          </div>
        )}
    </section>
  );
}

export default FeaturedRooms;