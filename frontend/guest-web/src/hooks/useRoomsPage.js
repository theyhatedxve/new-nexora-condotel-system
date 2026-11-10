import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useRoomTypes } from "./useRoomTypes";
import { getPhilippineToday, parseStaySearch } from "../utils/staySearch.js";

export default function useRoomsPage() {
  const metadata = useRoomTypes();

  const [params, setParams] = useSearchParams();

  const search = params.toString();

  const today = getPhilippineToday();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseStaySearch(search, today),
        error: "",
      };
    } catch (error) {
      return {
        query: null,
        error: error instanceof Error ? error.message : "The stay-search URL is invalid.",
      };
    }
  }, [search, today]);

  function clearInvalidSearch() {
    setParams("", { replace: true });
  }
  function applySearch(nextSearch) {
    setParams(nextSearch);
  }
  function clearSearch() {
    setParams("");
  }
  return { metadata, search, parsed, clearInvalidSearch, applySearch, clearSearch };
}
