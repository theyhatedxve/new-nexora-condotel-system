import { useState } from "react";
import { paymentListSearch } from "../services/paymentsApi";

export default function usePaymentFilters({ query, onApply }) {
  const [draft, setDraft] = useState(() => ({
    q: query.q,
    method: query.method,
    status: query.status,
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
      onApply(
        paymentListSearch({
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

  function changeMethod(event) {
    return edit("method", event.target.value);
  }

  function changeStatus(event) {
    return edit("status", event.target.value);
  }

  function changeLimit(event) {
    return edit("limit", event.target.value);
  }

  return { draft, error, submit, changeQ, changeMethod, changeStatus, changeLimit };
}
