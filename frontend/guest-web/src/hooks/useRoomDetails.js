import { useEffect, useState } from "react";

import {
  getRoomType,
  listRoomTypeAmenities,
  listRoomTypeImages,
} from "../services/roomTypesApi.js";

// Primary image first, then the order chosen by staff.
function sortImages(images) {
  return [...images].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.displayOrder - b.displayOrder,
  );
}

export function useRoomDetails(roomTypeId) {
  const [state, setState] = useState({ id: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Photos and amenities are optional, so their errors become empty lists.
        const [room, images, amenities] = await Promise.all([
          getRoomType(roomTypeId),
          listRoomTypeImages(roomTypeId).catch(() => []),
          listRoomTypeAmenities(roomTypeId).catch(() => []),
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
          const status = error.response?.status === 404 ? "notFound" : "error";
          setState({ id: roomTypeId, status });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [roomTypeId]);

  // Ignore results that belong to a previously viewed room.
  return state.id === roomTypeId ? state : { status: "loading" };
}