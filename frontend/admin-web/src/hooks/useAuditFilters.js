import { useState } from "react";
import { auditSearch, parseAuditQuery } from "../services/auditApi";

export default function useAuditFilters({ query, onApply }) {
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const next = {
        from: String(form.get("from") ?? ""),
        to: String(form.get("to") ?? ""),
        action: String(form.get("action") ?? "").trim(),
        entityType: String(form.get("entityType") ?? "").trim(),
        page: 1,
        limit: query.limit,
      };

      const checked = parseAuditQuery(auditSearch(next));

      onApply(checked);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Check the audit filters.");
    }
  }

  return { error, submit };
}
