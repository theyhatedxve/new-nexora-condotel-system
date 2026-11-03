import { useEffect, useState } from "react";

import {
  getRoomType,
  listRoomTypeAmenities,
  listRoomTypeImages,
} from "../services/roomTypesApi.js";

function projectRoom(data, roomTypeId) {
  if (
    !data ||
    data.id !== roomTypeId ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    !Number.isSafeInteger(data.capacity) ||
    data.capacity < 1 ||
    !Number.isSafeInteger(
      data.baseRateCentavos,
    ) ||
    data.baseRateCentavos < 0 ||
    (
      data.description !== null &&
      typeof data.description !== "string"
    )
  ) {
    throw new Error("Invalid room information.");
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    capacity: data.capacity,
    baseRateCentavos: data.baseRateCentavos,
  };
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

  return amenities.sort(
    (first, second) =>
      first.name.localeCompare(
        second.name,
        "en",
      ) ||
      first.id.localeCompare(second.id, "en"),
  );
}

export function useRoomDetails(roomTypeId) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);

  const validId =
    typeof roomTypeId === "string" &&
    /^[A-Za-z0-9_-]{1,100}$/.test(roomTypeId);

  useEffect(() => {
    if (!validId) return;

    let active = true;

    async function load() {
      try {
        const room = projectRoom(
          await getRoomType(roomTypeId),
          roomTypeId,
        );

        if (!active) return;

        const [imageResult, amenityResult] =
          await Promise.allSettled([
            listRoomTypeImages(roomTypeId),
            listRoomTypeAmenities(roomTypeId),
          ]);

        if (!active) return;

        let images = [];
        let imagesStatus = "error";
        let amenities = [];
        let amenitiesStatus = "error";

        if (imageResult.status === "fulfilled") {
          try {
            images = projectImages(
              imageResult.value,
              roomTypeId,
            );

            imagesStatus = "ready";
          } catch {
            imagesStatus = "error";
          }
        }

        if (
          amenityResult.status === "fulfilled"
        ) {
          try {
            amenities = projectAmenities(
              amenityResult.value,
            );

            amenitiesStatus = "ready";
          } catch {
            amenitiesStatus = "error";
          }
        }

        setState({
          id: roomTypeId,
          revision,
          status: "success",
          room,
          images,
          imagesStatus,
          amenities,
          amenitiesStatus,
        });
      } catch (error) {
        if (!active) return;

        setState({
          id: roomTypeId,
          revision,
          status:
            error.response?.status === 404
              ? "notFound"
              : "error",
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [roomTypeId, revision, validId]);

  function retry() {
    setRevision((value) => value + 1);
  }

  if (!validId) {
    return {
      status: "notFound",
      retry,
    };
  }

  if (
    state?.id !== roomTypeId ||
    state.revision !== revision
  ) {
    return {
      status: "loading",
      retry,
    };
  }

  return {
    ...state,
    retry,
  };
}