import api from "./api";

const maximum = 2_147_483_647;

function validRoomType(data) {
  return (
    data &&
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    (
      data.description === null ||
      typeof data.description === "string"
    ) &&
    typeof data.isActive === "boolean" &&
    Number.isSafeInteger(data.capacity) &&
    data.capacity >= 1 &&
    data.capacity <= maximum &&
    Number.isSafeInteger(data.baseRateCentavos) &&
    data.baseRateCentavos >= 1 &&
    data.baseRateCentavos <= maximum
  );
}

function recordId(id) {
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 100
  ) {
    throw new Error("Invalid room type.");
  }

  return encodeURIComponent(id);
}

function text(value, label, maximumLength, required = true) {
  if (typeof value !== "string") {
    throw new Error(label + " must be text.");
  }

  const result = value.trim();

  if (
    (required && result.length === 0) ||
    result.length > maximumLength
  ) {
    throw new Error(
      label +
      (
        required
          ? " must contain 1–" + maximumLength + " characters."
          : " must contain at most " + maximumLength + " characters."
      ),
    );
  }

  return result;
}

function capacityValue(value) {
  if (
    typeof value !== "string" ||
    !/^\d{1,10}$/.test(value.trim())
  ) {
    throw new Error("Capacity must be a positive whole number.");
  }

  const capacity = Number(value.trim());

  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > maximum
  ) {
    throw new Error(
      "Capacity must be between 1 and " + maximum + ".",
    );
  }

  return capacity;
}

export function pesosToCentavos(value) {
  if (typeof value !== "string") {
    throw new Error("Enter a nightly rate in pesos.");
  }

  const amount = value.trim();

  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error(
      "Enter pesos with up to two decimal places, without commas.",
    );
  }

  const [whole, fraction = ""] = amount.split(".");

  const centavos =
    Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"));

  if (
    !Number.isSafeInteger(centavos) ||
    centavos < 1 ||
    centavos > maximum
  ) {
    throw new Error(
      "Nightly rate must be between PHP 0.01 and PHP 21,474,836.47.",
    );
  }

  return centavos;
}

export function centavosToPesosInput(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > maximum
  ) {
    throw new Error("The saved nightly rate requires review.");
  }

  return (
    Math.floor(value / 100) +
    "." +
    String(value % 100).padStart(2, "0")
  );
}

export async function listStaffRoomTypes(signal) {
  const response = await api.get(
    "/staff/room-types",
    { signal },
  );

  const data = response.data?.data;

  if (
    !Array.isArray(data) ||
    !data.every(validRoomType)
  ) {
    throw new Error("Room types are unavailable.");
  }

  return data;
}

export function createRoomTypeChangeRequest(input) {
  if (
    input.kind !== "create-room-type" &&
    input.kind !== "edit-room-type"
  ) {
    throw new Error("Unsupported room-type operation.");
  }

  const body = {
    name: text(input.name, "Name", 100),
    description:
      text(input.description, "Description", 2000, false) ||
      null,
    capacity: capacityValue(input.capacity),
    baseRateCentavos: pesosToCentavos(input.nightlyRate),
  };

  let method = "post";
  let path = "/room-types";

  if (input.kind === "edit-room-type") {
    if (typeof input.isActive !== "boolean") {
      throw new Error("Choose the room-type active state.");
    }

    body.isActive = input.isActive;
    method = "patch";
    path += "/" + recordId(input.roomTypeId);
  }

  return Object.freeze({
    kind: input.kind,
    roomTypeId: input.roomTypeId,
    method,
    path,
    body: Object.freeze(body),
  });
}

export async function sendRoomTypeChange(request) {
  const response = await api.request({
    method: request.method,
    url: request.path,
    data: request.body,
  });

  const data = response.data?.data;
  const body = request.body;

  if (
    !validRoomType(data) ||
    (
      request.kind === "edit-room-type" &&
      data.id !== request.roomTypeId
    ) ||
    data.name !== body.name ||
    data.description !== body.description ||
    data.capacity !== body.capacity ||
    data.baseRateCentavos !== body.baseRateCentavos ||
    data.isActive !== (
      request.kind === "create-room-type"
        ? true
        : body.isActive
    )
  ) {
    throw new Error(
      "The response could not confirm the room-type change.",
    );
  }

  return data;
}