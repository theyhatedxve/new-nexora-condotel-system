import { useEffect, useRef } from "react";
import { useStaffData } from "./useStaffData";
import { guestListSearch, listGuestPage } from "../services/guestsApi";

export default function useGuestResults({ query, onPage }) {
  const state = useStaffData(listGuestPage, query);

  const resultSummary = useRef(null);

  const lastQuery = useRef(query);

  const focusAfterRefresh = useRef(false);

  useEffect(() => {
    if (state.status === "ready" && state.data.page !== query.page) {
      onPage(state.data.page, true);
    }
  }, [state.status, state.data, query.page, onPage]);

  useEffect(() => {
    if (
      state.status === "ready" &&
      (lastQuery.current !== query || focusAfterRefresh.current)
    ) {
      resultSummary.current?.focus();
      lastQuery.current = query;
      focusAfterRefresh.current = false;
    }
  }, [state.status, state.data, query]);

  const data = state.status === "ready" ? state.data : null;

  const start = data?.items.length ? (data.page - 1) * data.limit + 1 : 0;

  const end = data?.items.length ? start + data.items.length - 1 : 0;

  const listSearch = data
    ? guestListSearch({
        ...query,
        page: data.page,
      })
    : "";

  function refreshResults() {
    focusAfterRefresh.current = true;
    state.reload();
  }

  function previousPage() {
    return onPage(data.page - 1);
  }

  function nextPage() {
    return onPage(data.page + 1);
  }

  return {
    state,
    resultSummary,
    data,
    start,
    end,
    listSearch,
    refreshResults,
    previousPage,
    nextPage,
  };
}
