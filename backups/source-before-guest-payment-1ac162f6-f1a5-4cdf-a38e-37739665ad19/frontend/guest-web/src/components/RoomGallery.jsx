import { useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from "lucide-react";

import {
  toApiUrl,
} from "../services/api.js";

function RoomGallery({
  roomName,
  images,
  status,
  onRetry,
}) {
  const [selectedId, setSelectedId] =
    useState(null);

  const [failedIds, setFailedIds] =
    useState([]);

  function markFailed(imageId) {
    setFailedIds((previous) =>
      previous.includes(imageId)
        ? previous
        : [...previous, imageId],
    );
  }

  const selectedIndex = Math.max(
    0,
    images.findIndex(
      (image) => image.id === selectedId,
    ),
  );

  const selected = images[selectedIndex];

  if (status === "error" || !selected) {
    return (
      <section
        className="room-gallery-view"
        aria-label={`${roomName} photographs`}
      >
        <div className="room-gallery-view__empty">
          <ImageOff
            size={38}
            aria-hidden="true"
          />

          <p>
            {status === "error"
              ? "Room photos could not be loaded."
              : "Room photos coming soon."}
          </p>

          {status === "error" && (
            <button
              type="button"
              className="room-detail-view__secondary"
              onClick={onRetry}
            >
              Retry room information
            </button>
          )}
        </div>
      </section>
    );
  }

  const selectedFailed =
    failedIds.includes(selected.id);

  return (
    <section
      className="room-gallery-view"
      aria-label={`${roomName} photographs`}
    >
      <div className="room-gallery-view__main">
        {selectedFailed ? (
          <div className="room-gallery-view__empty">
            <ImageOff
              size={38}
              aria-hidden="true"
            />

            <p>This photo is unavailable.</p>

            <button
              type="button"
              className="room-detail-view__secondary"
              onClick={onRetry}
            >
              Retry room information
            </button>
          </div>
        ) : (
          <img
            key={selected.id}
            src={toApiUrl(selected.url)}
            alt={
              selected.altText ||
              `${roomName}, photo ${
                selectedIndex + 1
              }`
            }
            decoding="async"
            className="room-gallery-view__image"
            onError={() =>
              markFailed(selected.id)
            }
          />
        )}
      </div>

      <div className="room-gallery-view__controls">
        <button
          type="button"
          className="room-gallery-view__control"
          disabled={selectedIndex === 0}
          onClick={() =>
            setSelectedId(
              images[selectedIndex - 1].id,
            )
          }
          aria-label="Previous room photo"
        >
          <ChevronLeft
            size={20}
            aria-hidden="true"
          />
          <span>Previous</span>
        </button>

        <p role="status">
          Photo {selectedIndex + 1} of{" "}
          {images.length}
        </p>

        <button
          type="button"
          className="room-gallery-view__control"
          disabled={
            selectedIndex === images.length - 1
          }
          onClick={() =>
            setSelectedId(
              images[selectedIndex + 1].id,
            )
          }
          aria-label="Next room photo"
        >
          <span>Next</span>
          <ChevronRight
            size={20}
            aria-hidden="true"
          />
        </button>
      </div>

      {images.length > 1 && (
        <div
          className="room-gallery-view__thumbnails"
          role="group"
          aria-label="Choose a room photo"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className="room-gallery-view__thumbnail"
              aria-pressed={
                image.id === selected.id
              }
              aria-label={`Show photo ${
                index + 1
              } of ${roomName}`}
              onClick={() =>
                setSelectedId(image.id)
              }
            >
              {failedIds.includes(image.id) ? (
                <ImageOff
                  size={24}
                  aria-hidden="true"
                />
              ) : (
                <img
                  src={toApiUrl(image.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    markFailed(image.id)
                  }
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default RoomGallery;