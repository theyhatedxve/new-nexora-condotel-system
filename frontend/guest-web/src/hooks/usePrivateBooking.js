import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getCurrentBooking,
} from "../services/bookingAccessApi.js";

const statuses = new Set([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
]);

export default function usePrivateBooking(
  expectedReference = null,
) {
  const pinnedReference = useRef(
    expectedReference,
  );

  const [revision, setRevision] =
    useState(0);

  const [state, setState] = useState({
    status: "loading",
    booking: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getCurrentBooking(controller.signal)
      .then((booking) => {
        if (controller.signal.aborted) return;

        if (
          !booking ||
          typeof booking.reservationNumber !==
            "string" ||
          !statuses.has(booking.status) ||
          !Number.isFinite(
            Date.parse(
              booking.accessExpiresAt,
            ),
          )
        ) {
          throw new Error(
            "Invalid private booking response.",
          );
        }

        if (
          pinnedReference.current &&
          booking.reservationNumber !==
            pinnedReference.current
        ) {
          throw new Error(
            "BOOKING_SCOPE_CHANGED",
          );
        }

        pinnedReference.current =
          booking.reservationNumber;

        if (
          Date.parse(
            booking.accessExpiresAt,
          ) <= Date.now()
        ) {
          setState({
            status: "unavailable",
            booking: null,
          });
          return;
        }

        setState({
          status: "ready",
          booking,
        });
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;

        setState({
          status:
            failure.response?.status === 404 ||
            failure.message ===
              "BOOKING_SCOPE_CHANGED"
              ? "unavailable"
              : "error",
          booking: null,
        });
      });

    return () => controller.abort();
  }, [revision]);

  const booking = state.booking;

  useEffect(() => {
    if (!booking) return;

    const expiresAt = Date.parse(
      booking.accessExpiresAt,
    );

    const expire = () => {
      if (Date.now() >= expiresAt) {
        setState({
          status: "unavailable",
          booking: null,
        });
      }
    };

    const timer = window.setTimeout(
      expire,
      Math.max(
        0,
        expiresAt - Date.now(),
      ),
    );

    window.addEventListener(
      "focus",
      expire,
    );

    document.addEventListener(
      "visibilitychange",
      expire,
    );

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        "focus",
        expire,
      );

      document.removeEventListener(
        "visibilitychange",
        expire,
      );
    };
  }, [booking]);

  function refresh() {
    setState({
      status: "loading",
      booking: null,
    });

    setRevision((value) => value + 1);
  }

  return {
    ...state,
    revision,
    refresh,
  };
}