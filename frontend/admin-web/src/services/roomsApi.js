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

function roomText(value, label, min, max) {
  if (typeof value !== "string") {
    throw new Error(label + " is required.");
  }

  const text = value.trim();

  if (text.length < min || text.length > max) {
    throw new Error(
      label + " must contain " + min + "–" + max + " characters.",
    );
  }

  return text;
}

function blockDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error("Enter a valid block date.");
  }

  const date = new Date(value + "T00:00:00Z");

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Enter a valid block date.");
  }

  return value;
}

export function createRoomChangeRequest(command) {
  const kind = command.kind;
  let method;
  let path;
  let body;

  if (kind === "create-room" || kind === "edit-room") {
    const floor = roomText(
      command.floor ?? "",
      "Floor",
      0,
      30,
    );

    body = {
      roomNumber: roomText(
        command.roomNumber,
        "Room number",
        1,
        30,
      ),
      floor: floor || null,
    };

    if (kind === "create-room") {
      roomPathId(command.roomTypeId);
      body.roomTypeId = command.roomTypeId;
      method = "post";
      path = "/rooms";
    } else {
      if (typeof command.isActive !== "boolean") {
        throw new Error("Choose the room active setting.");
      }

      body.isActive = command.isActive;

      if (command.roomTypeId !== undefined) {
        roomPathId(command.roomTypeId);
        body.roomTypeId = command.roomTypeId;
      }

      method = "patch";
      path = "/rooms/" + roomPathId(command.roomId);
    }
  } else if (kind === "room-status") {
    if (
      ![
        "READY",
        "CLEANING",
        "MAINTENANCE",
        "OUT_OF_SERVICE",
      ].includes(command.status)
    ) {
      throw new Error("Choose a permitted room status.");
    }

    method = "patch";
    path = "/rooms/" + roomPathId(command.roomId) + "/status";
    body = { status: command.status };
  } else if (
    kind === "create-block" ||
    kind === "edit-block"
  ) {
    const startDate = blockDate(command.startDate);
    const endDate = blockDate(command.endDate);

    if (startDate >= endDate) {
      throw new Error(
        "Block end date must be after its start date.",
      );
    }

    body = {
      startDate,
      endDate,
      reason: roomText(
        command.reason,
        "Reason",
        3,
        500,
      ).replace(/\s+/g, " "),
    };

    path = "/rooms/" + roomPathId(command.roomId) + "/blocks";
    method = "post";

    if (kind === "edit-block") {
      path += "/" + roomPathId(command.blockId);
      method = "patch";
    }
  } else if (kind === "cancel-block") {
    method = "post";
    path =
      "/rooms/" +
      roomPathId(command.roomId) +
      "/blocks/" +
      roomPathId(command.blockId) +
      "/cancel";

    body = undefined;
  } else {
    throw new Error("Unknown room action.");
  }

  return Object.freeze({
    kind,
    roomId: command.roomId,
    blockId: command.blockId,
    method,
    path,
    body: body ? Object.freeze(body) : undefined,
  });
}

export async function sendRoomChange(request) {
  const response = await api.request({
    method: request.method,
    url: request.path,
    data: request.body,
  });

  const data = response.data?.data;

  if (!data || typeof data.id !== "string") {
    throw new Error("The room change was not acknowledged.");
  }

  const body = request.body;

  if (
    request.kind === "create-room" ||
    request.kind === "edit-room"
  ) {
    if (
      (
        request.kind === "edit-room" &&
        data.id !== request.roomId
      ) ||
      data.roomNumber !== body.roomNumber ||
      data.floor !== body.floor ||
      (
        body.roomTypeId !== undefined &&
        data.roomTypeId !== body.roomTypeId
      ) ||
      typeof data.isActive !== "boolean" ||
      (
        request.kind === "edit-room" &&
        data.isActive !== body.isActive
      ) ||
      typeof data.roomType?.id !== "string"
    ) {
      throw new Error("The room change was not acknowledged.");
    }
  } else if (request.kind === "room-status") {
    if (
      data.id !== request.roomId ||
      data.status !== body.status
    ) {
      throw new Error("The status change was not acknowledged.");
    }
  } else {
    if (
      data.roomId !== request.roomId ||
      (
        request.kind !== "create-block" &&
        data.id !== request.blockId
      )
    ) {
      throw new Error("The block change was not acknowledged.");
    }

    if (request.kind === "cancel-block") {
      if (
        typeof data.canceledAt !== "string" ||
        !Number.isFinite(Date.parse(data.canceledAt))
      ) {
        throw new Error(
          "Block cancellation was not acknowledged.",
        );
      }
    } else if (
      data.startDate?.slice(0, 10) !== body.startDate ||
      data.endDate?.slice(0, 10) !== body.endDate ||
      data.reason !== body.reason ||
      data.canceledAt !== null
    ) {
      throw new Error("The block change was not acknowledged.");
    }
  }

  return data;
}

export const ROOM_LIST_STATUSES = [
  "READY",
  "CLEANING",
  "OCCUPIED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
];

export function parseRoomListQuery(search) {
  if (
    typeof search !== "string" ||
    search.length > 2000
  ) {
    throw new Error("Room filters are invalid.");
  }

  const params = new URLSearchParams(search);

  const allowed = [
    "q",
    "status",
    "isActive",
    "roomTypeId",
    "page",
    "limit",
  ];

  for (const name of params.keys()) {
    if (
      !allowed.includes(name) ||
      params.getAll(name).length !== 1
    ) {
      throw new Error(
        "Room filters contain unsupported or repeated parameters.",
      );
    }
  }

  const q = (params.get("q") ?? "").trim();
  const status = params.get("status") ?? "";
  const isActive = params.get("isActive") ?? "";
  const roomTypeId =
    (params.get("roomTypeId") ?? "").trim();

  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "20";

  if (q.length > 30) {
    throw new Error(
      "Room search must contain at most 30 characters.",
    );
  }

  if (
    status &&
    !ROOM_LIST_STATUSES.includes(status)
  ) {
    throw new Error("Choose a valid room status.");
  }

  if (
    isActive &&
    !["true", "false"].includes(isActive)
  ) {
    throw new Error("Choose a valid active filter.");
  }

  if (roomTypeId.length > 100) {
    throw new Error("The room type filter is invalid.");
  }

  if (
    !/^\d+$/.test(pageText) ||
    !/^\d+$/.test(limitText)
  ) {
    throw new Error(
      "Pagination values must be whole numbers.",
    );
  }

  const page = Number(pageText);
  const limit = Number(limitText);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000 ||
    ![20, 50].includes(limit)
  ) {
    throw new Error(
      "Choose a page from 1 to 10000 and a page size of 20 or 50.",
    );
  }

  return {
    q,
    status,
    isActive,
    roomTypeId,
    page,
    limit,
  };
}

export function roomListSearch(query) {
  const params = new URLSearchParams();

  for (const name of [
    "q",
    "status",
    "isActive",
    "roomTypeId",
  ]) {
    if (
      query[name] !== undefined &&
      query[name] !== null &&
      query[name] !== ""
    ) {
      params.set(name, String(query[name]));
    }
  }

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const normalized = parseRoomListQuery(
    params.toString(),
  );

  const result = new URLSearchParams();

  for (const name of [
    "q",
    "status",
    "isActive",
    "roomTypeId",
  ]) {
    if (normalized[name]) {
      result.set(name, normalized[name]);
    }
  }

  result.set("page", String(normalized.page));
  result.set("limit", String(normalized.limit));

  return result.toString();
}

function roomListRecord(room) {
  return (
    room &&
    typeof room.id === "string" &&
    typeof room.roomNumber === "string" &&
    (
      room.floor === null ||
      typeof room.floor === "string"
    ) &&
    typeof room.isActive === "boolean" &&
    ROOM_LIST_STATUSES.includes(room.status) &&
    typeof room.roomTypeId === "string" &&
    room.roomType?.id === room.roomTypeId &&
    typeof room.roomType.name === "string" &&
    typeof room.roomType.isActive === "boolean" &&
    Number.isSafeInteger(room.roomType.capacity) &&
    room.roomType.capacity > 0
  );
}

export async function listRoomPage(query, signal) {
  const search = roomListSearch(query);
  const expected = parseRoomListQuery(search);

  const response = await api.get(
    "/staff/rooms",
    {
      signal,
      params: new URLSearchParams(search),
    },
  );

  const data = response.data?.data;

  if (
    !data ||
    !Array.isArray(data.items) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.limit !== expected.limit
  ) {
    throw new Error("Room page is unavailable.");
  }

  const totalPages = Math.ceil(data.total / data.limit);

  const page = data.total === 0
    ? 1
    : Math.min(expected.page, totalPages);

  const expectedLength = Math.min(
    data.limit,
    Math.max(
      data.total - (page - 1) * data.limit,
      0,
    ),
  );

  if (
    data.page !== page ||
    data.totalPages !== totalPages ||
    data.items.length !== expectedLength ||
    !data.items.every(roomListRecord)
  ) {
    throw new Error("Room page is unavailable.");
  }

  return data;
}

