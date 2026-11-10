import { useState } from "react";
import { reservationListSearch } from "../services/reservationsApi";

export default function useReservationFilters({ query, onApply }) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    status: query.status,
    checkInFrom: query.checkInFrom,
    checkInTo: query.checkInTo,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

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
      const search = reservationListSearch({
        ...draft,
        page: 1,
        limit: Number(draft.limit),
      });

      onApply(search);
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

  function changeCheckInFrom(event) {
    return edit("checkInFrom", event.target.value);
  }

  function changeCheckInTo(event) {
    return edit("checkInTo", event.target.value);
  }

  function changeLimit(event) {
    return edit("limit", event.target.value);
  }

  return {
    draft,
    error,
    submit,
    changeQ,
    changeStatus,
    changeCheckInFrom,
    changeCheckInTo,
    changeLimit,
  };
}
