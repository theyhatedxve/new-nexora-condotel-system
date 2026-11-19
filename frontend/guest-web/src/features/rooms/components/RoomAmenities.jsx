import { Check } from "lucide-react";

export default function RoomAmenities({ room }) {
  if (room?.amenitiesStatus !== "ready") {
    return (
      <p className="rooms-card__note">
        Amenity information is unavailable.
      </p>
    );
  }

  if (room.amenities.length === 0) {
    return (
      <p className="rooms-card__note">No amenities listed yet.</p>
    );
  }

  return (
    <ul
      className="rooms-card__amenities"
      aria-label={`${room.name} amenities`}
    >
      {room.amenities.map((amenity) => (
        <li key={amenity.id}>
          <Check size={15} aria-hidden="true" />
          {amenity.name}
        </li>
      ))}
    </ul>
  );
}