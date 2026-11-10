import { useEffect, useRef } from "react";
import { useStaffData } from "./useStaffData";
import { listAuditPage, parseAuditQuery } from "../services/auditApi";

export default function useAuditDirectory({ query, onChange }) {
  const state = useStaffData(listAuditPage, query);

  const resultsRef = useRef(null);

  const focusResults = useRef(false);

  const data = state.status === "ready" ? state.data : null;

  useEffect(() => {
    if (!data) return;

    if (data.page !== query.page) {
      onChange(
        {
          ...query,
          page: data.page,
        },
        true,
      );

      return;
    }

    if (focusResults.current) {
      focusResults.current = false;
      resultsRef.current?.focus();
    }
  }, [data, query, onChange]);

  function navigate(next) {
    focusResults.current = true;
    onChange(next);
  }

  function clearFilters() {
    navigate(parseAuditQuery(""));
  }

  function refresh() {
    focusResults.current = true;
    state.reload();
  }

  const first = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;

  const last = data && data.total > 0 ? first + data.items.length - 1 : 0;

  function handleNavigate(event) {
    return navigate({
      ...query,
      page: 1,
      limit: Number(event.target.value),
    });
  }

  function previousPage() {
    return navigate({
      ...query,
      page: data.page - 1,
    });
  }

  function nextPage() {
    return navigate({
      ...query,
      page: data.page + 1,
    });
  }

  return {
    state,
    resultsRef,
    data,
    navigate,
    clearFilters,
    refresh,
    first,
    last,
    handleNavigate,
    previousPage,
    nextPage,
  };
}
