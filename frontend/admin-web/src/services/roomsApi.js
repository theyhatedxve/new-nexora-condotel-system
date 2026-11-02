import api from "./api";

export async function listRooms(signal) {
  const response = await api.get("/rooms", {
    signal,
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  const data = response.data?.data;

  if (
    !Array.isArray(data) ||
    !data.every(
      (room) =>
        typeof room?.id === "string" &&
        typeof room.roomNumber === "string" &&
        typeof room.roomTypeId === "string" &&
        typeof room.isActive === "boolean" &&
        [
          "READY",
          "CLEANING",
          "OCCUPIED",
          "MAINTENANCE",
          "OUT_OF_SERVICE",
        ].includes(room.status) &&
        typeof room.roomType?.id === "string" &&
        typeof room.roomType.isActive === "boolean" &&
        Number.isSafeInteger(room.roomType.capacity) &&
        room.roomType.capacity > 0,
    )
  ) {
    throw new Error("Room catalog is unavailable.");
  }

  return data;
}

function roomPathId(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Invalid room.");
  }

  return encodeURIComponent(id);
}

export async function getRoom(id, signal) {
  const response = await api.get(
    "/rooms/" + roomPathId(id),
    {
      signal,
      headers: {
        "Cache-Control": "no-cache",
      },
    },
  );

  const data = response.data?.data;

  if (
    !data ||
    data.id !== id ||
    typeof data.roomNumber !== "string" ||
    !(
      data.floor === null ||
      typeof data.floor === "string"
    ) ||
    typeof data.isActive !== "boolean" ||
    typeof data.roomTypeId !== "string" ||
    ![
      "READY",
      "CLEANING",
      "OCCUPIED",
      "MAINTENANCE",
      "OUT_OF_SERVICE",
    ].includes(data.status) ||
    data.roomType?.id !== data.roomTypeId ||
    typeof data.roomType.name !== "string" ||
    typeof data.roomType.isActive !== "boolean" ||
    !Number.isSafeInteger(data.roomType.capacity) ||
    data.roomType.capacity < 1
  ) {
    throw new Error("Room details are unavailable.");
  }

  return data;
}

export async function getRoomBlocks(id, signal) {
  const response = await api.get(
    "/rooms/" + roomPathId(id) + "/blocks",
    {
      signal,
      headers: {
        "Cache-Control": "no-cache",
      },
    },
  );

  const data = response.data?.data;

  if (
    !Array.isArray(data) ||
    !data.every(
      (block) =>
        typeof block?.id === "string" &&
        block.roomId === id &&
        typeof block.startDate === "string" &&
        typeof block.endDate === "string" &&
        typeof block.reason === "string" &&
        typeof block.createdAt === "string" &&
        (
          block.canceledAt === null ||
          typeof block.canceledAt === "string"
        ),
    )
  ) {
    throw new Error("Room block history is unavailable.");
  }

  return data;
}