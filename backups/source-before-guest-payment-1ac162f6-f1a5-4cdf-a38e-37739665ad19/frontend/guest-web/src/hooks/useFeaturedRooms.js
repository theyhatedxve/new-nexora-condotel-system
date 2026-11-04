import { useEffect, useState } from "react";

import {
  listRoomTypes,
  listRoomTypeImages,
  listRoomTypeAmenities,
} from "../services/roomTypesApi.js";

function compareNames(first, second) {
  return (
    first.name.localeCompare(second.name, "en") ||
    first.id.localeCompare(second.id, "en")
  );
}

function projectRoomTypes(data) {
  if (!Array.isArray(data)) {
    throw new Error("Invalid room information.");
  }

  const ids = new Set();

  const rooms = data.map((room) => {
    if (
      !room ||
      typeof room.id !== "string" ||
      !room.id ||
      ids.has(room.id) ||
      typeof room.name !== "string" ||
      !room.name.trim() ||
      !Number.isSafeInteger(room.capacity) ||
      room.capacity < 1 ||
      !Number.isSafeInteger(
        room.baseRateCentavos,
      ) ||
      room.baseRateCentavos < 0 ||
      (
        room.description !== null &&
        typeof room.description !== "string"
      )
    ) {
      throw new Error("Invalid room information.");
    }

    ids.add(room.id);

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      baseRateCentavos:
        room.baseRateCentavos,
    };
  });

  return rooms.sort(compareNames).slice(0, 3);
}

function projectImages(data, roomTypeId) {
  if (!Array.isArray(data)) {
    throw new Error("Invalid image information.");
  }

  const ids = new Set();

  const images = data.map((image) => {
    if (
      !image ||
      typeof image.id !== "string" ||
      !image.id ||
      ids.has(image.id) ||
      image.roomTypeId !== roomTypeId ||
      typeof image.url !== "string" ||
      !/^\/api\/room-images\/[^/?#]+\/file$/.test(
        image.url,
      ) ||
      typeof image.isPrimary !== "boolean" ||
      !Number.isSafeInteger(
        image.displayOrder,
      ) ||
      image.displayOrder < 0 ||
      (
        image.altText !== null &&
        typeof image.altText !== "string"
      )
    ) {
      throw new Error("Invalid image information.");
    }

    ids.add(image.id);

    return {
      id: image.id,
      url: image.url,
      altText: image.altText,
      isPrimary: image.isPrimary,
      displayOrder: image.displayOrder,
    };
  });

  return images.sort(
    (first, second) =>
      Number(second.isPrimary) -
        Number(first.isPrimary) ||
      first.displayOrder -
        second.displayOrder ||
      first.id.localeCompare(second.id, "en"),
  );
}

function projectAmenities(data) {
  if (!Array.isArray(data)) {
    throw new Error(
      "Invalid amenity information.",
    );
  }

  const ids = new Set();

  const amenities = data.map((amenity) => {
    if (
      !amenity ||
      typeof amenity.id !== "string" ||
      !amenity.id ||
      ids.has(amenity.id) ||
      typeof amenity.name !== "string" ||
      !amenity.name.trim()
    ) {
      throw new Error(
        "Invalid amenity information.",
      );
    }

    ids.add(amenity.id);

    return {
      id: amenity.id,
      name: amenity.name,
    };
  });

  return amenities
    .sort(compareNames)
    .slice(0, 3);
}

async function loadRoomInformation(room) {
  const [imageResult, amenityResult] =
    await Promise.allSettled([
      listRoomTypeImages(room.id),
      listRoomTypeAmenities(room.id),
    ]);

  let image = null;
  let imageStatus = "error";
  let amenities = [];
  let amenitiesStatus = "error";

  if (imageResult.status === "fulfilled") {
    try {
      const images = projectImages(
        imageResult.value,
        room.id,
      );

      image = images[0] ?? null;
      imageStatus = image ? "ready" : "missing";
    } catch {
      imageStatus = "error";
    }
  }

  if (amenityResult.status === "fulfilled") {
    try {
      amenities = projectAmenities(
        amenityResult.value,
      );

      amenitiesStatus = "ready";
    } catch {
      amenitiesStatus = "error";
    }
  }

  return {
    ...room,
    image,
    imageStatus,
    amenities,
    amenitiesStatus,
  };
}

export function useFeaturedRooms() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await listRoomTypes();

        if (!active) return;

        const selected = projectRoomTypes(data);

        const rooms = await Promise.all(
          selected.map(loadRoomInformation),
        );

        if (!active) return;

        setState({
          revision,
          status: "success",
          rooms,
        });
      } catch {
        if (!active) return;

        setState({
          revision,
          status: "error",
          rooms: [],
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [revision]);

  function retry() {
    setRevision((value) => value + 1);
  }

  if (state?.revision !== revision) {
    return {
      status: "loading",
      rooms: [],
      retry,
    };
  }

  return {
    ...state,
    retry,
  };
}