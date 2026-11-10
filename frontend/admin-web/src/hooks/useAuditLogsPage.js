import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { auditSearch, parseAuditQuery } from "../services/auditApi";

export default function useAuditLogsPage() {
  const [params, setParams] = useSearchParams();

  const search = params.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseAuditQuery(search),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure instanceof Error ? failure.message : "The audit URL is invalid.",
      };
    }
  }, [search]);

  const changeQuery = useCallback(
    (next, replace = false) => {
      setParams(auditSearch(next), { replace });
    },
    [setParams],
  );

  function clearFilters() {
    return setParams("", { replace: true });
  }

  return { parsed, changeQuery, clearFilters };
}
