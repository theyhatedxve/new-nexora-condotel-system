import { useCallback, useEffect, useState } from "react";
import { getMyBookings } from "../services/guestReservationsApi.js";

const PAGE_LIMIT = 20;

export default function useGuestBookings() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    items: [],
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const controller = new AbortController();

    getMyBookings(page, PAGE_LIMIT, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setState({
          status: data.items.length === 0 ? "empty" : "ready",
          items: data.items,
          total: data.total,
          totalPages: data.totalPages,
        });
      },
      () => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          items: [],
          total: 0,
          totalPages: 0,
        });
      },
    );

    return () => controller.abort();
  }, [page, revision]);

  const goToPage = useCallback((nextPage) => {
    setState((prev) => ({ ...prev, status: "loading" }));
    setPage(nextPage);
  }, []);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, status: "loading" }));
    setRevision((value) => value + 1);
  }, []);

  return {
    ...state,
    page,
    goToPage,
    refresh,
  };
}
