import { useEffect, useState } from "react";

import {
  listRoomTypes,
  listRoomTypeImages,
} from "../services/roomTypesApi.js";

// A missing photo should not hide the room, so image errors become "no image".
async function addPrimaryImage(roomType) {
  try {
    const images = await listRoomTypeImages(roomType.id);
    const image = images.find((item) => item.isPrimary) ?? images[0] ?? null;
    return { ...roomType, image };
  } catch {
    return { ...roomType, image: null };
  }
}

export function useRoomTypes() {
  const [state, setState] = useState({ status: "loading", rooms: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const roomTypes = await listRoomTypes();
        const rooms = await Promise.all(roomTypes.map(addPrimaryImage));

        if (!cancelled) {
          setState({ status: "success", rooms });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", rooms: [] });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}