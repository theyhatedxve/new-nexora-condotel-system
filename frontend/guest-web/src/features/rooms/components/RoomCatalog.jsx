import RoomCard from "./RoomCard.jsx";
import RoomBrowser from "./RoomBrowser.jsx";

export function RoomCatalog({ metadata }) {
  const { status, rooms, retry } = metadata;

  if (status === "success" && rooms.length > 0) {
    return (
      <RoomBrowser
        headingId="all-rooms-title"
        title="Explore Our Rooms"
        description="Compare room types and recorded amenities. Catalog rates are per night."
        items={rooms}
        priceKey="baseRateCentavos"
        priceLabel="Nightly rate"
        renderRoom={(room) => <RoomCard room={room} />}
      />
    );
  }

  return (
    <section aria-labelledby="all-rooms-title">
      <h2 id="all-rooms-title" className="availability-section-title">
        Explore Our Rooms
      </h2>

      {status === "loading" && (
        <p className="rooms-message" role="status">
          Loading rooms…
        </p>
      )}

      {status === "error" && (
        <div className="guest-feedback">
          <p role="alert">
            We could not retrieve the room listings.
          </p>
          <button
            type="button"
            className="feedback-retry-button"
            onClick={retry}
          >
            Try Again
          </button>
        </div>
      )}

      {status === "success" && rooms.length === 0 && (
        <div className="guest-feedback">
          <p role="status">
            No room types are currently listed.
          </p>
          <button
            type="button"
            className="feedback-retry-button"
            onClick={retry}
          >
            Refresh Rooms
          </button>
        </div>
      )}
    </section>
  );
}