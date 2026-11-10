import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { loadBookingAttempt } from "../utils/bookingAttempt.js";
import {
  bookingReferenceFromSearch,
  getBookingApiScope,
} from "../utils/bookingContext.js";

export default function usePaymentReturnContext() {
  const [params] = useSearchParams();

  const search = params.toString();

  const [storedReference] = useState(() => {
    try {
      return loadBookingAttempt(getBookingApiScope())?.reservationNumber || null;
    } catch {
      return null;
    }
  });

  const context = useMemo(() => {
    try {
      return {
        reference: bookingReferenceFromSearch(search) || storedReference,
        invalid: false,
      };
    } catch {
      return {
        reference: null,
        invalid: true,
      };
    }
  }, [search, storedReference]);

  return { context };
}
