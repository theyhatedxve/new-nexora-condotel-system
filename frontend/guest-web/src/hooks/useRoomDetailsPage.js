import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { useRoomDetails } from "./useRoomDetails";
import {
  getPhilippineToday,
  parseStaySearch,
  staySearchParams,
} from "../utils/staySearch.js";

export default function useRoomDetailsPage() {
  const { id } = useParams();

  const [params] = useSearchParams();

  const search = params.toString();

  const today = getPhilippineToday();

  const details = useRoomDetails(id);

  const selection = useMemo(() => {
    try {
      const query = parseStaySearch(search, today);

      return {
        query,
        serialized: query ? staySearchParams(query) : "",
        error: "",
      };
    } catch (error) {
      return {
        query: null,
        serialized: "",
        error: error instanceof Error ? error.message : "Check your stay selection.",
      };
    }
  }, [search, today]);

  const roomsHref = selection.serialized ? `/rooms?${selection.serialized}` : "/rooms";

  if (["loading", "notFound", "error"].includes(details.status))
    return { details, selection, roomsHref };

  const { room, images, imagesStatus, amenities, amenitiesStatus, retry } = details;

  const selectedStay = selection.query;

  const capacityExceeded = selectedStay !== null && selectedStay.guests > room.capacity;

  const canContinue = selectedStay !== null && !capacityExceeded;

  const checkoutHref = canContinue
    ? `/checkout/${encodeURIComponent(room.id)}?${selection.serialized}`
    : null;

  return {
    details,
    selection,
    roomsHref,
    room,
    images,
    imagesStatus,
    amenities,
    amenitiesStatus,
    retry,
    selectedStay,
    capacityExceeded,
    checkoutHref,
  };
}
