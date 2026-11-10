import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { parseRoomListQuery, roomListSearch } from "../services/roomsApi";

export default function useRoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseRoomListQuery(queryKey),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure.message,
      };
    }
  }, [queryKey]);

  const changePage = useCallback(
    (page, replace = false) => {
      if (!parsed.query) return;

      setSearchParams(
        roomListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  function clearFilters() {
    return setSearchParams("");
  }

  function changeSearchParams(search) {
    return setSearchParams(search);
  }

  return { queryKey, parsed, changePage, clearFilters, changeSearchParams };
}
