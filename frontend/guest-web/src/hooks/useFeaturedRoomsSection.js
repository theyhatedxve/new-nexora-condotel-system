import { useFeaturedRooms } from "./useFeaturedRooms";

export default function useFeaturedRoomsSection() {
  const { status, rooms, retry } = useFeaturedRooms();

  const partialFailure =
    status === "success" &&
    rooms.some(
      (room) => room.imageStatus === "error" || room.amenitiesStatus === "error",
    );

  return { status, rooms, retry, partialFailure };
}
