import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  parseReconciliationPagesQuery,
  reconciliationPagesSearch,
} from "../services/reconciliationApi";

export default function usePaymentReconciliationPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseReconciliationPagesQuery(queryKey),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure.message,
      };
    }
  }, [queryKey]);

  const changePage = useCallback(
    (name, page) => {
      if (!parsed.query) return;

      const fields = {
        payments: "paymentPage",
        refunds: "refundPage",
        events: "eventPage",
      };

      const field = fields[name];

      if (!field) return;

      setSearchParams(
        reconciliationPagesSearch({
          ...parsed.query,
          [field]: page,
        }),
      );
    },
    [parsed.query, setSearchParams],
  );

  const normalizePages = useCallback(
    (pages) => {
      if (!parsed.query) return;

      setSearchParams(
        reconciliationPagesSearch({
          ...parsed.query,
          ...pages,
        }),
        { replace: true },
      );
    },
    [parsed.query, setSearchParams],
  );

  function changeLimit(limit) {
    setSearchParams(
      reconciliationPagesSearch({
        paymentPage: 1,
        refundPage: 1,
        eventPage: 1,
        limit,
      }),
    );
  }

  function clearFilters() {
    return setSearchParams("");
  }

  return { parsed, changePage, normalizePages, changeLimit, clearFilters };
}
