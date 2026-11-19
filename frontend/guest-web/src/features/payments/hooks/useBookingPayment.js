import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGuestBookingCheckout,
  getGuestBookingPaymentSummary,
  startGuestBookingCheckout,
} from "../../checkout/services/guestBookingApi.js";
import {
  getCheckoutRetryTarget,
  retryReservationCheckout,
  getReservationCheckout,
  getReservationPaymentSummary,
  startReservationCheckout,
} from "../services/bookingPaymentsApi.js";
import { checkoutRequestIdFor, checkoutRetryRequestIdFor } from "../../checkout/utils/bookingContext.js";

export default function useBookingPayment({ booking }) {
  const reservationId = booking.id;
  const reference = booking.reservationNumber;

  const pendingOnline =
    booking.bookingPolicyVersion === "guest-booking-v2" &&
    booking.paymentPreference === "PAYMONGO";

  const holdExpiresAt = booking.holdExpiresAt;

  const [state, setState] = useState({
    busy: true,
    record: null,
    error: "",
  });

  const [revision, setRevision] = useState(0);

  const [now, setNow] = useState(() => Date.now());

  const alive = useRef(false);

  const pending = useRef(false);

  const inspect = useCallback(
    async (signal) => {
      const summary = reservationId
        ? await getReservationPaymentSummary(reservationId, reference, signal)
        : await getGuestBookingPaymentSummary(reference, signal);

      const closed = ["CANCELLED", "EXPIRED", "CHECKED_IN", "CHECKED_OUT"].includes(
        summary.reservationStatus,
      );

      const activePending =
        summary.reservationStatus === "PENDING" &&
        pendingOnline &&
        holdExpiresAt &&
        Date.parse(holdExpiresAt) > Date.now();

      const eligible =
        !closed &&
        !summary.requiresReview &&
        summary.status !== "PAID" &&
        summary.balanceDueCentavos > 0 &&
        (summary.reservationStatus === "CONFIRMED" || activePending);

      const checkout = eligible
        ? reservationId
          ? await getReservationCheckout(reservationId, signal)
          : await getGuestBookingCheckout(reference, signal)
        : null;

      const retryTarget = eligible && reservationId && pendingOnline &&
        ["READY", "UNKNOWN"].includes(checkout?.state)
        ? await getCheckoutRetryTarget(reservationId, signal) : null;

      return { summary, checkout, retryTarget };
    },
    [reservationId, reference, pendingOnline, holdExpiresAt],
  );

  useEffect(() => {
    alive.current = true;

    const controller = new AbortController();

    inspect(controller.signal)
      .then((record) => {
        if (!controller.signal.aborted) {
          setState({
            busy: false,
            record,
            error: "",
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            busy: false,
            record: null,
            error:
              "Payment records could not be checked for this booking. Refresh its details or sign in again before paying.",
          });
        }
      });

    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [inspect, revision]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function createCheckout() {
    if (pending.current || state.busy || state.record?.checkout?.state !== "NONE") {
      return;
    }

    pending.current = true;

    setState({
      busy: true,
      record: null,
      error: "",
    });

    try {
      const requestId = checkoutRequestIdFor(reference);

      if (reservationId) {
        await startReservationCheckout({
          reservationId,
          requestId,
        });
      } else {
        await startGuestBookingCheckout({
          requestId,
          expectedReservationNumber: reference,
        });
      }

      const record = await inspect();

      if (alive.current) {
        setState({
          busy: false,
          record,
          error: "",
        });
      }
    } catch {
      if (alive.current) {
        setState({
          busy: false,
          record: null,
          error:
            "The payment-link result is uncertain. Check the existing attempt before trying again. The original request ID is retained.",
        });
      }
    } finally {
      pending.current = false;
    }
  }

  async function retryCheckout() {
    const target = state.record?.retryTarget;
    if (pending.current || state.busy || !canRetry || !target?.paymentId) return;
    pending.current = true;
    setState({ busy: true, record: null, error: "" });
    try {
      await retryReservationCheckout({
        reservationId,
        previousPaymentId: target.paymentId,
        requestId: checkoutRetryRequestIdFor(reference, target.paymentId),
      });
      const record = await inspect();
      if (alive.current) setState({ busy: false, record, error: "" });
    } catch {
      if (alive.current) setState({
        busy: false, record: null,
        error: "The retry result could not be confirmed. Check payment records before trying again. The original deadline and retry request are retained.",
      });
    } finally {
      pending.current = false;
    }
  }

  function refresh() {
    if (pending.current) return;

    setState({
      busy: true,
      record: null,
      error: "",
    });

    setRevision((value) => value + 1);
  }

  const summary = state.record?.summary;

  const checkout = state.record?.checkout;

  const deadlineReached =
    summary?.reservationStatus === "PENDING" &&
    holdExpiresAt &&
    Date.parse(holdExpiresAt) <= now;

  const paid = summary?.status === "PAID" && !summary.requiresReview;

  const canRetry = !state.busy && !deadlineReached && pendingOnline &&
    summary?.reservationStatus === "PENDING" && !summary.requiresReview &&
    Boolean(state.record?.retryTarget?.available);

  return { state, createCheckout, retryCheckout, canRetry, refresh, summary, checkout, deadlineReached, paid };
}
