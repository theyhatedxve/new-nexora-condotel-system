import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { bookingReferenceFromSearch } from "../utils/bookingContext.js";

export default function useMyBookingContext() {
  const [params] = useSearchParams();

  const search = params.toString();

  const context = useMemo(() => {
    try {
      return {
        reference: bookingReferenceFromSearch(search),
        error: "",
      };
    } catch {
      return {
        reference: null,
        error: "The booking context is invalid.",
      };
    }
  }, [search]);

  return { context };
}
