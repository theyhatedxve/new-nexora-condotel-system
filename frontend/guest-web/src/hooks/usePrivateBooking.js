import { useEffect, useState } from "react";
import { getAccountBooking } from "../services/accountBookingsApi";

export default function usePrivateBooking(expectedReference = null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", booking: null });

  useEffect(() => {
    const controller = new AbortController();
    if (!expectedReference) {
      setState({ status: "unavailable", booking: null });
      return () => controller.abort();
    }
    getAccountBooking(expectedReference, controller.signal).then(
      (booking) => {
        if (!controller.signal.aborted) setState({ status: "ready", booking });
      },
      (error) => {
        if (!controller.signal.aborted) {
          setState({
            status: error.response?.status === 404 ? "unavailable" : "error",
            booking: null,
          });
        }
      },
    );
    return () => controller.abort();
  }, [expectedReference, revision]);

  function refresh() {
    setState({ status: "loading", booking: null });
    setRevision((value) => value + 1);
  }
  return { ...state, revision, refresh };
}
