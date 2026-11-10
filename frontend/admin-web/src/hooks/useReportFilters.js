import { useState } from "react";
import { validateReportRange } from "../services/reportsApi";

export default function useReportFilters({ onApply }) {
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const range = validateReportRange(form.get("from"), form.get("to"));

      onApply(range);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Check the selected dates.");
    }
  }

  return { error, submit };
}
