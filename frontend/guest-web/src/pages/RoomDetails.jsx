import { useMemo } from "react";

import {
  Link,
  useParams,
  useSearchParams,
} from "react-router";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
} from "lucide-react";

import RoomGallery from "../components/RoomGallery";

import {
  useRoomDetails,
} from "../hooks/useRoomDetails";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import {
  getPhilippineToday,
  parseStaySearch,
  stayNights,
  staySearchParams,
} from "../utils/staySearch.js";

import "../styles/room-details.css";

function BackLink({ to }) {
  return (
    <Link
      to={to}
      className="room-detail-view__back"
    >
      <ArrowLeft
        size={18}
        aria-hidden="true"
      />
      Back to rooms
    </Link>
  );
}

function RoomDetails() {
  const { id } = useParams();

  const [params] = useSearchParams();

  const search = params.toString();
  const today = getPhilippineToday();

  const details = useRoomDetails(id);

  const selection = useMemo(() => {
    try {
      const query = parseStaySearch(
        search,
        today,
      );

      return {
        query,
        serialized: query
          ? staySearchParams(query)
          : "",
        error: "",
      };
    } catch (error) {
      return {
        query: null,
        serialized: "",
        error:
          error instanceof Error
            ? error.message
            : "Check your stay selection.",
      };
    }
  }, [search, today]);

  const roomsHref = selection.serialized
    ? `/rooms?${selection.serialized}`
    : "/rooms";

  if (details.status === "loading") {
    return (
      <main className="room-detail-view">
        <BackLink to={roomsHref} />

        <h1>Room details</h1>

        <p
          className="room-detail-view__feedback"
          role="status"
        >
          Loading room information...
        </p>
      </main>
    );
  }

  if (details.status === "notFound") {
    return (
      <main className="room-detail-view">
        <BackLink to={roomsHref} />

        <div className="room-detail-view__feedback">
          <h1>Room not found</h1>

          <p>
            This room type is unavailable.
            Please choose another room.
          </p>
        </div>
      </main>
    );
  }

  if (details.status === "error") {
    return (
      <main className="room-detail-view">
        <BackLink to={roomsHref} />

        <div className="room-detail-view__feedback">
          <h1>Room details unavailable</h1>

          <p role="alert">
            Room information could not be loaded.
            Please try again.
          </p>

          <button
            type="button"
            className="room-detail-view__secondary"
            onClick={details.retry}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const {
    room,
    images,
    imagesStatus,
    amenities,
    amenitiesStatus,
    retry,
  } = details;

  const selectedStay = selection.query;

  const capacityExceeded =
    selectedStay !== null &&
    selectedStay.guests > room.capacity;

  const canContinue =
    selectedStay !== null &&
    !capacityExceeded;

  const checkoutHref = canContinue
    ? `/checkout/${encodeURIComponent(
        room.id,
      )}?${selection.serialized}`
    : null;

  return (
    <main className="room-detail-view">
      <BackLink to={roomsHref} />

      <header className="room-detail-view__heading">
        <div>
          <p className="room-detail-view__eyebrow">
            Find your space
          </p>

          <h1>{room.name}</h1>

          <p className="room-detail-view__capacity">
            <Users
              size={19}
              aria-hidden="true"
            />

            Up to {room.capacity}{" "}
            {room.capacity === 1
              ? "guest"
              : "guests"}
          </p>
        </div>

        <p className="room-detail-view__rate">
          <strong>
            {formatPesos(
              room.baseRateCentavos,
            )}
          </strong>
          <span>per night</span>
        </p>
      </header>

      <RoomGallery
        roomName={room.name}
        images={images}
        status={imagesStatus}
        onRetry={retry}
      />

      <div className="room-detail-view__layout">
        <div className="room-detail-view__information">
          {room.description && (
            <section
              className="room-detail-view__section"
              aria-labelledby="room-about-title"
            >
              <h2 id="room-about-title">
                About this room
              </h2>

              <p>{room.description}</p>
            </section>
          )}

          <section
            className="room-detail-view__section"
            aria-labelledby="room-amenities-title"
          >
            <h2 id="room-amenities-title">
              Room amenities
            </h2>

            {amenitiesStatus === "error" ? (
              <div className="room-detail-view__notice">
                <p role="status">
                  Amenity information could not
                  be loaded.
                </p>

                <button
                  type="button"
                  className="room-detail-view__secondary"
                  onClick={retry}
                >
                  Retry room information
                </button>
              </div>
            ) : amenities.length > 0 ? (
              <ul className="room-detail-view__amenities">
                {amenities.map((amenity) => (
                  <li key={amenity.id}>
                    <Check
                      size={18}
                      aria-hidden="true"
                    />

                    <span>{amenity.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No amenities listed yet.</p>
            )}
          </section>
        </div>

        <aside
          className="room-detail-view__stay"
          aria-labelledby="room-stay-title"
        >
          <h2 id="room-stay-title">
            Plan your stay
          </h2>

          {selectedStay ? (
            <dl className="room-detail-view__stay-values">
              <div>
                <dt>Check-in</dt>
                <dd>{selectedStay.checkIn}</dd>
              </div>

              <div>
                <dt>Check-out</dt>
                <dd>{selectedStay.checkOut}</dd>
              </div>

              <div>
                <dt>Guests</dt>
                <dd>{selectedStay.guests}</dd>
              </div>

              <div>
                <dt>Nights</dt>
                <dd>
                  {stayNights(
                    selectedStay.checkIn,
                    selectedStay.checkOut,
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p>
              Choose your dates and guest count
              to check availability and the full
              stay price.
            </p>
          )}

          {selection.error && (
            <p
              role="alert"
              className="room-detail-view__error"
            >
              {selection.error}
            </p>
          )}

          {capacityExceeded && (
            <p
              role="alert"
              className="room-detail-view__error"
            >
              Your selected guest count exceeds
              this room&apos;s capacity. Adjust
              your search or choose another room.
            </p>
          )}

          {checkoutHref ? (
            <Link
              to={checkoutHref}
              className="room-detail-view__primary"
            >
              Continue to booking
              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <Link
              to={roomsHref}
              className="room-detail-view__primary"
            >
              Check availability
              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </Link>
          )}

          {selectedStay && (
            <Link
              to={roomsHref}
              className="room-detail-view__change"
            >
              Change dates or guests
            </Link>
          )}

          <p className="room-detail-view__stay-note">
            Availability and the total stay price
            are checked before booking. Viewing
            this page does not reserve a room.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default RoomDetails;