import RoomCard from "../RoomCard";

export function RoomCatalog({ metadata }) {
  const { status, rooms, retry } = metadata;

  return (
    <section aria-labelledby="all-rooms-title">
      <h2 id="all-rooms-title" className="availability-section-title">
        Explore Our Rooms
      </h2>

      <p className="rooms-intro">Rates shown are per night.</p>

      {status === "loading" && (
        <p className="rooms-message" role="status">
          Loading rooms...
        </p>
      )}

      {status === "error" && (
        <div className="guest-feedback" role="alert">
          <h3>Unable to load rooms</h3>

          <p>We could not retrieve the room listings. Please try again.</p>

          <button type="button" className="feedback-retry-button" onClick={retry}>
            Try Again
          </button>
        </div>
      )}

      {status === "success" && rooms.length === 0 && (
        <div className="guest-feedback" role="status">
          <h3>No rooms to display</h3>

          <p>There are currently no room types listed. Please check again later.</p>

          <button type="button" className="feedback-retry-button" onClick={retry}>
            Refresh Rooms
          </button>
        </div>
      )}

      {status === "success" && rooms.length > 0 && (
        <div className="room-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}
