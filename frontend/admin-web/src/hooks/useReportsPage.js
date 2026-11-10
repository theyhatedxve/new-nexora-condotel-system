import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { parseReportQuery, reportSearch, reportToday } from "../services/reportsApi";

export default function useReportsPage() {
  const [params, setParams] = useSearchParams();

  const search = params.toString();

  const today = reportToday();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseReportQuery(search, today),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure instanceof Error ? failure.message : "The report URL is invalid.",
      };
    }
  }, [search, today]);

  function applyRange(query) {
    setParams(reportSearch(query));
  }

  function resetRange() {
    setParams(
      reportSearch({
        from: today,
        to: today,
      }),
      { replace: true },
    );
  }

  return { parsed, applyRange, resetRange };
}
