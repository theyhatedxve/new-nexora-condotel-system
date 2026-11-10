import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../auth/useAuth";
import { parsePaymentListQuery, paymentListSearch } from "../services/paymentsApi";

export default function usePaymentsPage() {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const queryKey = searchParams.toString();

  const canReviewReconciliation = ["ADMIN", "MANAGER"].includes(user?.role);

  const parsed = useMemo(() => {
    try {
      return {
        query: parsePaymentListQuery(queryKey),
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
    (page, replace = false) => {
      if (!parsed.query) return;

      setSearchParams(
        paymentListSearch({
          ...parsed.query,
          page,
        }),
        { replace },
      );
    },
    [parsed.query, setSearchParams],
  );

  function clearFilters() {
    return setSearchParams("");
  }

  function changeSearchParams(search) {
    return setSearchParams(search);
  }

  return {
    queryKey,
    canReviewReconciliation,
    parsed,
    changePage,
    clearFilters,
    changeSearchParams,
  };
}
