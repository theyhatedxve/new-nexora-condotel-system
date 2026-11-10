import { useEffect, useRef } from "react";
import { useStaffData } from "./useStaffData";
import { listReconciliationPage } from "../services/reconciliationApi";

export default function useReconciliationQueues({ query, onPage, onNormalize, onLimit }) {
  const state = useStaffData(listReconciliationPage, query);

  const paymentHeading = useRef(null);

  const refundHeading = useRef(null);

  const eventHeading = useRef(null);

  const focusQueue = useRef(null);

  const data = state.status === "ready" ? state.data : null;

  const pagesCurrent = Boolean(
    data &&
    data.pagination.payments.page === query.paymentPage &&
    data.pagination.refunds.page === query.refundPage &&
    data.pagination.events.page === query.eventPage,
  );

  useEffect(() => {
    if (data && !pagesCurrent) {
      onNormalize({
        paymentPage: data.pagination.payments.page,
        refundPage: data.pagination.refunds.page,
        eventPage: data.pagination.events.page,
      });
    }
  }, [data, pagesCurrent, onNormalize]);

  useEffect(() => {
    if (!data || !pagesCurrent || !focusQueue.current) {
      return;
    }

    const headings = {
      payments: paymentHeading,
      refunds: refundHeading,
      events: eventHeading,
    };

    headings[focusQueue.current]?.current?.focus();
    focusQueue.current = null;
  }, [data, pagesCurrent]);

  function navigate(name, page) {
    focusQueue.current = name;
    onPage(name, page);
  }

  function changePageSize(event) {
    return onLimit(Number(event.target.value));
  }

  return {
    state,
    paymentHeading,
    refundHeading,
    eventHeading,
    data,
    navigate,
    changePageSize,
  };
}
