import { useLocation, useParams } from "react-router";
import { useStaffData } from "./useStaffData";
import {
  getPayment,
  parsePaymentListQuery,
  paymentListSearch,
} from "../services/paymentsApi";
import { useAuth } from "../auth/useAuth";

export default function usePaymentDetailsPage() {
  const { paymentId } = useParams();

  const location = useLocation();

  let returnSearch = "";

  const savedSearch = location.state?.paymentListSearch;

  if (typeof savedSearch === "string" && savedSearch.length <= 2000) {
    try {
      returnSearch = paymentListSearch(parsePaymentListQuery(savedSearch));
    } catch {
      returnSearch = "";
    }
  }

  const state = useStaffData(getPayment, paymentId);

  const { user } = useAuth();

  const canManageRefunds = ["ADMIN", "MANAGER"].includes(user?.role);

  const payment = state.status === "ready" ? state.data : null;

  const receiptFields = payment?.collection
    ? [
        ["Verified collection", payment.collection.collectedCentavos],
        ["Completed refunds", payment.collection.refundedCentavos],
        ["Pending refunds", payment.collection.pendingRefundCentavos],
        ["Net collection", payment.collection.netPaidCentavos],
      ]
    : [];

  const summary = payment?.bookingSummary;

  const bookingFields = summary
    ? [
        ["Booked total", summary.bookedTotalCentavos],
        ["Total collected", summary.collectedCentavos],
        ["Completed refunds", summary.refundedCentavos],
        ["Pending refunds", summary.pendingRefundCentavos],
        ["Net paid", summary.netPaidCentavos],
        ["Balance due", summary.balanceDueCentavos],
        ["Overpayment", summary.overpaidCentavos],
      ]
    : [];

  return {
    paymentId,
    returnSearch,
    state,
    canManageRefunds,
    payment,
    receiptFields,
    summary,
    bookingFields,
  };
}
