import { useEffect, useState } from "react";
import {
  listRoomTypes,
  listRoomTypeImages,
  listRoomTypeAmenities,
} from "../services/roomTypesApi.js";

function readAmenities(data) {
  if (!Array.isArray(data)) return null;

  const ids = new Set();

  for (const item of data) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim()
    ) {
      return null;
    }

    ids.add(item.id);
  }

  return data.map(({ id, name }) => ({ id, name }));
}

async function addRoomInformation(room) {
  const [imageResult, amenityResult] = await Promise.allSettled([
    listRoomTypeImages(room.id),
    listRoomTypeAmenities(room.id),
  ]);

  const images =
    imageResult.status === "fulfilled" &&
    Array.isArray(imageResult.value)
      ? imageResult.value.filter(
          (image) =>
            typeof image?.url === "string" &&
            /^\/api\/room-images\/[^/?#]+\/file$/.test(image.url),
        )
      : [];

  const image =
    images.find((item) => item.isPrimary) ?? images[0] ?? null;

  const amenities =
    amenityResult.status === "fulfilled"
      ? readAmenities(amenityResult.value)
      : null;

  return {
    ...room,
    image,
    amenities: amenities ?? [],
    amenitiesStatus: amenities === null ? "error" : "ready",
  };
}

export function useRoomTypes() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await listRoomTypes();

        if (
          !Array.isArray(data) ||
          data.some(
            (room) =>
              !room ||
              typeof room.id !== "string" ||
              !room.id ||
              typeof room.name !== "string" ||
              !room.name.trim() ||
              !Number.isSafeInteger(room.capacity) ||
              room.capacity < 1 ||
              !Number.isSafeInteger(room.baseRateCentavos) ||
              room.baseRateCentavos < 0 ||
              (room.description != null &&
                typeof room.description !== "string"),
          ) ||
          new Set(data.map((room) => room.id)).size !== data.length
        ) {
          throw new Error("Invalid room information.");
        }

        const rooms = await Promise.all(data.map(addRoomInformation));

        if (active) {
          setState({ revision, status: "success", rooms });
        }
      } catch {
        if (active) {
          setState({ revision, status: "error", rooms: [] });
        }
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
    return { status: "loading", rooms: [], retry };
  }

  return { ...state, retry };
}