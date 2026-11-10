import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { guestListSearch, parseGuestListQuery } from "../services/guestsApi";

export default function useGuestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseGuestListQuery(queryKey),
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
        guestListSearch({
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
