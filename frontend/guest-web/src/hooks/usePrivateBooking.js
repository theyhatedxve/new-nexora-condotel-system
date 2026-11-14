import { useEffect, useMemo, useState } from "react";
import { getAccountBooking } from "../services/accountBookingsApi.js";

export default function usePrivateBooking(expectedReference = null) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);

  const request = useMemo(
    () => ({ expectedReference, revision }),
    [expectedReference, revision],
  );

  useEffect(() => {
    if (!request.expectedReference) {
      return;
    }

    const controller = new AbortController();

    getAccountBooking(
      request.expectedReference,
      controller.signal,
    ).then(
      (booking) => {
        if (!controller.signal.aborted) {
          setResult({
            request,
            status: "ready",
            booking,
          });
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setResult({
            request,
            status:
              error.response?.status === 404
                ? "unavailable"
                : "error",
            booking: null,
          });
        }
      },
    );

    return () => controller.abort();
  }, [request]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  let status = "loading";
  let booking = null;

  if (!request.expectedReference) {
    status = "unavailable";
  } else if (result?.request === request) {
    status = result.status;
    booking = result.booking;
  }

  return {
    status,
    booking,
    revision,
    refresh,
  };
}
