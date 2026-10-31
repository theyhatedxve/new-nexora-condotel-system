
import { useEffect, useState } from "react";

import {
  listRoomTypes,
  listRoomTypeImages,
} from "../services/roomTypesApi.js";

// Missing room photos should not prevent room listings.
async function addPrimaryImage(roomType) {
  try {
    const images = await listRoomTypeImages(roomType.id);

    const image =
      images.find((item) => item.isPrimary) ??
      images[0] ??
      null;

    return { ...roomType, image };
  } catch {
    return { ...roomType, image: null };
  }
}

export function useRoomTypes() {
  const [state, setState] = useState({
    status: "loading",
    rooms: [],
  });

  const [retryCount, setRetryCount] = useState(0);

  function retry() {
    setRetryCount((count) => count + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setState({
        status: "loading",
        rooms: [],
      });

      try {
        const roomTypes = await listRoomTypes();

        const rooms = await Promise.all(
          roomTypes.map(addPrimaryImage),
        );

        if (!cancelled) {
          setState({
            status: "success",
            rooms,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            rooms: [],
          });
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return {
    ...state,
    retry,
  };
}
