
import { useEffect, useState } from "react";

import {
  getRoomType,
  listRoomTypeAmenities,
  listRoomTypeImages,
} from "../services/roomTypesApi.js";

function sortImages(images) {
  return [...images].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.displayOrder - b.displayOrder,
  );
}

export function useRoomDetails(roomTypeId) {
  const [state, setState] = useState({
    id: null,
    status: "loading",
  });

  const [retryCount, setRetryCount] = useState(0);

  function retry() {
    setRetryCount((count) => count + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadRoomDetails() {
      setState({
        id: roomTypeId,
        status: "loading",
      });

      try {
        const [room, images, amenities] =
          await Promise.all([
            getRoomType(roomTypeId),

            // Photos and amenities remain optional.
            listRoomTypeImages(roomTypeId).catch(() => []),
            listRoomTypeAmenities(roomTypeId).catch(
              () => [],
            ),
          ]);

        if (!cancelled) {
          setState({
            id: roomTypeId,
            status: "success",
            room,
            images: sortImages(images),
            amenities,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const status =
            error.response?.status === 404
              ? "notFound"
              : "error";

          setState({
            id: roomTypeId,
            status,
          });
        }
      }
    }

    loadRoomDetails();

    return () => {
      cancelled = true;
    };
  }, [roomTypeId, retryCount]);

  // Never show details belonging to a previous room.
  if (state.id !== roomTypeId) {
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
