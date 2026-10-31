import RoomCard from "../components/RoomCard";
import { useRoomTypes } from "../hooks/useRoomTypes";

import AvailabilitySearch from "../components/AvailabilitySearch";

function Rooms() {
  const { status, rooms } = useRoomTypes();

  <AvailabilitySearch />

  return (
    <main className="rooms-page">
      <h1>Our Rooms</h1>
      <p className="rooms-intro">Rates shown are per night.</p>

      {status === "loading" && (
        <p className="rooms-message" role="status">
          Loading rooms...
        </p>
      )}

      {status === "error" && (
        <p className="rooms-message rooms-error" role="alert">
          We could not load the rooms. Please try again later.
        </p>
      )}

      {status === "success" && rooms.length === 0 && (
        <p className="rooms-message">
          No rooms are available to show right now.
        </p>
      )}

      {status === "success" && rooms.length > 0 && (
        <div className="room-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </main>
  );
}

export default Rooms;