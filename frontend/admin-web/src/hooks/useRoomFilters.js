import { useState } from "react";
import { roomListSearch } from "../services/roomsApi";

export default function useRoomFilters({ query, catalog, onApply }) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    status: query.status,
    isActive: query.isActive,
    roomTypeId: query.roomTypeId,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

  const types = Array.from(
    new Map(
      (catalog.data ?? []).map((room) => [room.roomTypeId, room.roomType]),
    ).values(),
  ).sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );

  const selectedTypeMissing =
    draft.roomTypeId && !types.some((type) => type.id === draft.roomTypeId);

  function edit(name, value) {
    setDraft((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      onApply(
        roomListSearch({
          ...draft,
          page: 1,
          limit: Number(draft.limit),
        }),
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function changeQ(event) {
    return edit("q", event.target.value);
  }

  function changeStatus(event) {
    return edit("status", event.target.value);
  }

  function changeIsActive(event) {
    return edit("isActive", event.target.value);
  }

  function changeRoomTypeId(event) {
    return edit("roomTypeId", event.target.value);
  }

  function changeLimit(event) {
    return edit("limit", event.target.value);
  }

  return {
    draft,
    error,
    types,
    selectedTypeMissing,
    submit,
    changeQ,
    changeStatus,
    changeIsActive,
    changeRoomTypeId,
    changeLimit,
  };
}
