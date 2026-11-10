import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { getPhilippineToday, parseStaySearch } from "../utils/staySearch.js";

export default function useCheckoutSelection() {
  const { roomTypeId } = useParams();

  const [params] = useSearchParams();

  const search = params.toString();

  const [today] = useState(() => getPhilippineToday());

  const parsed = useMemo(() => {
    try {
      const stay = parseStaySearch(search, today);

      if (!stay || !roomTypeId || roomTypeId.length > 100) {
        throw new Error("Choose a room, dates, and guest count from the Rooms page.");
      }

      return {
        selection: {
          ...stay,
          roomTypeId,
        },
        error: "",
      };
    } catch (error) {
      return {
        selection: null,
        error: error.message,
      };
    }
  }, [roomTypeId, search, today]);

  return { roomTypeId, search, parsed };
}
