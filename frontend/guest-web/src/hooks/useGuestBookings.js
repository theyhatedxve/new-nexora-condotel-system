import { useEffect, useMemo, useState } from "react";
import { listMyBookings } from "../services/guestReservationsApi.js";

export default function useGuestBookings(page) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const request = useMemo(() => ({ page, revision }), [page, revision]);

  useEffect(() => {
    const controller = new AbortController();
    listMyBookings(request.page, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({ request, status: "ready", data });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setResult({ request, status: "error", data: null });
        }
      },
    );
    return () => controller.abort();
  }, [request]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  if (result?.request !== request) {
    return { status: "loading", data: null, refresh };
  }
  return { status: result.status, data: result.data, refresh };
}
