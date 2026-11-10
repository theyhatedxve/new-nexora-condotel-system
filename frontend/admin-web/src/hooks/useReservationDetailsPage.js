import { useLocation, useParams } from "react-router";
import { useStaffData } from "./useStaffData";
import {
  getReservation,
  getAssignmentHistory,
  getReservationPaymentSummary,
  parseReservationListQuery,
  reservationListSearch,
} from "../services/reservationsApi";

export default function useReservationDetailsPage() {
  const { reservationId } = useParams();

  const location = useLocation();

  let returnSearch = "";

  const savedSearch = location.state?.reservationListSearch;

  if (typeof savedSearch === "string" && savedSearch.length <= 2000) {
    try {
      returnSearch = reservationListSearch(parseReservationListQuery(savedSearch));
    } catch {
      returnSearch = "";
    }
  }

  const record = useStaffData(getReservation, reservationId);

  const assignments = useStaffData(getAssignmentHistory, reservationId);

  const payment = useStaffData(getReservationPaymentSummary, reservationId);

  const booking = record.data;

  const summary = payment.data;

  function refresh() {
    record.reload();
    assignments.reload();
    payment.reload();
  }

  return {
    reservationId,
    returnSearch,
    record,
    assignments,
    payment,
    booking,
    summary,
    refresh,
  };
}
