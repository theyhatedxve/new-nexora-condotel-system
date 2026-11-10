import { useState } from "react";
import { guestListSearch } from "../services/guestsApi";

export default function useGuestFilters({ query, onApply }) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    limit: String(query.limit),
  }));

  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    try {
      onApply(
        guestListSearch({
          q: draft.q,
          page: 1,
          limit: Number(draft.limit),
        }),
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function changeSearch(event) {
    return setDraft((previous) => ({
      ...previous,
      q: event.target.value,
    }));
  }

  function changePageSize(event) {
    return setDraft((previous) => ({
      ...previous,
      limit: event.target.value,
    }));
  }

  return { draft, error, submit, changeSearch, changePageSize };
}
