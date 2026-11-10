import { useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import { useStaffData } from "./useStaffData";
import { listRooms, listRoomPage, roomListSearch } from "../services/roomsApi";

export default function useRoomDirectory({ query, onPage }) {
  const { user } = useAuth();

  const catalog = useStaffData(listRooms);

  const records = useStaffData(listRoomPage, query);

  const resultSummary = useRef(null);

  const lastQuery = useRef(query);

  const focusAfterRefresh = useRef(false);

  const canManage = ["ADMIN", "MANAGER"].includes(user?.role);

  useEffect(() => {
    if (records.status === "ready" && records.data.page !== query.page) {
      onPage(records.data.page, true);
    }
  }, [records.status, records.data, query.page, onPage]);

  useEffect(() => {
    if (
      records.status === "ready" &&
      (lastQuery.current !== query || focusAfterRefresh.current)
    ) {
      resultSummary.current?.focus();
      lastQuery.current = query;
      focusAfterRefresh.current = false;
    }
  }, [records.status, records.data, query]);

  function refreshAll() {
    catalog.reload();
    records.reload();
  }

  const data = records.status === "ready" ? records.data : null;

  const start = data?.items.length ? (data.page - 1) * data.limit + 1 : 0;

  const end = data?.items.length ? start + data.items.length - 1 : 0;

  const listSearch = roomListSearch({
    ...query,
    page: data?.page ?? query.page,
  });

  const creationCatalog = {
    ...catalog,
    reload: refreshAll,
  };

  function refreshResults() {
    focusAfterRefresh.current = true;
    refreshAll();
  }

  function previousPage() {
    return onPage(data.page - 1);
  }

  function nextPage() {
    return onPage(data.page + 1);
  }

  return {
    catalog,
    records,
    resultSummary,
    canManage,
    data,
    start,
    end,
    listSearch,
    creationCatalog,
    refreshResults,
    previousPage,
    nextPage,
  };
}
