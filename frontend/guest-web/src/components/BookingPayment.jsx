import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getGuestBookingCheckout,
  getGuestBookingPaymentSummary,
  startGuestBookingCheckout,
} from "../services/guestBookingApi.js";

import {
  checkoutRequestIdFor,
} from "../utils/bookingContext.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

export default function BookingPayment({
  booking,
}) {
  const reference =
    booking.reservationNumber;

  const pendingOnline =
    booking.bookingPolicyVersion ===
      "guest-booking-v2" &&
    booking.paymentPreference ===
      "PAYMONGO";

  const holdExpiresAt =
    booking.holdExpiresAt;

  const [state, setState] = useState({
    busy: true,
    record: null,
    error: "",
  });

  const [revision, setRevision] =
    useState(0);

  const [now, setNow] = useState(
    () => Date.now(),
  );

  const alive = useRef(false);
  const pending = useRef(false);

  const inspect = useCallback(
    async (signal) => {
      const summary =
        await getGuestBookingPaymentSummary(
          reference,
          signal,
        );

      const closed = [
        "CANCELLED",
        "EXPIRED",
        "CHECKED_IN",
        "CHECKED_OUT",
      ].includes(
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
        (
          summary.reservationStatus ===
            "CONFIRMED" ||
          activePending
        );

      const checkout = eligible
        ? await getGuestBookingCheckout(
            reference,
            signal,
          )
        : null;

      return {
        summary,
        checkout,
      };
    },
    [
      reference,
      pendingOnline,
      holdExpiresAt,
    ],
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
              "Payment records could not be checked for this booking. Refresh its details or request private access before paying again.",
          });
        }
      });

    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [
    inspect,
    revision,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function createCheckout() {
    if (
      pending.current ||
      state.busy ||
      state.record?.checkout?.state !== "NONE"
    ) {
      return;
    }

    pending.current = true;

    setState({
      busy: true,
      record: null,
      error: "",
    });

    try {
      const requestId =
        checkoutRequestIdFor(reference);

      await startGuestBookingCheckout({
        requestId,
        expectedReservationNumber:
          reference,
      });

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

  function refresh() {
    if (pending.current) return;

    setState({
      busy: true,
      record: null,
      error: "",
    });

    setRevision((value) => value + 1);
  }

  const summary =
    state.record?.summary;

  const checkout =
    state.record?.checkout;

  const deadlineReached =
    summary?.reservationStatus === "PENDING" &&
    holdExpiresAt &&
    Date.parse(holdExpiresAt) <= now;

  const paid =
    summary?.status === "PAID" &&
    !summary.requiresReview;

  return (
    <section aria-labelledby="booking-payment-heading">
      <h2 id="booking-payment-heading">
        Payment
      </h2>

      {state.busy && (
        <p role="status">
          Checking verified backend records...
        </p>
      )}

      {state.error && (
        <p className="checkout-error" role="alert">
          {state.error}
        </p>
      )}

      {summary && (
        <>
          <dl className="checkout-summary">
            <div>
              <dt>Payment status</dt>
              <dd>
                {summary.status.replaceAll("_", " ")}
              </dd>
            </div>

            <div>
              <dt>Net recorded payment</dt>
              <dd>
                {formatPesos(
                  summary.netPaidCentavos,
                )}
              </dd>
            </div>

            <div>
              <dt>Balance due</dt>
              <dd>
                {summary.balanceDueCentavos === null
                  ? "Not applicable to this closed stay"
                  : formatPesos(
                      summary.balanceDueCentavos,
                    )}
              </dd>
            </div>
          </dl>

          {summary.reservationStatus !==
            booking.status && (
            <p className="checkout-note">
              The reservation status has changed.
              Refresh booking details to see its
              latest state.
            </p>
          )}

          {paid && (
            <p role="status">
              Full payment is recorded in the
              verified backend records.
            </p>
          )}

          {summary.requiresReview && (
            <p role="status" className="checkout-note">
              This payment needs property review.
              Contact the property before paying again.
            </p>
          )}
        </>
      )}

      {deadlineReached && (
        <p role="status" className="checkout-note">
          The pending hold deadline has been reached.
          Refresh booking details before continuing.
        </p>
      )}

      {!state.busy && !deadlineReached &&
        checkout?.state === "NONE" &&
        checkout.amountCentavos > 0 && (
          <p>
            <button
              className="checkout-button"
              type="button"
              onClick={createCheckout}
            >
              Prepare PayMongo test checkout
            </button>
          </p>
        )}

      {!state.busy && !deadlineReached &&
        checkout?.state === "READY" && (
          <p>
            <a
              className="checkout-link"
              href={checkout.checkoutUrl}
              rel="noreferrer noopener"
            >
              Continue to PayMongo test checkout
            </a>
          </p>
        )}

      {["CREATING", "UNKNOWN"].includes(
        checkout?.state,
      ) && (
        <p role="status" className="checkout-note">
          The existing payment attempt is unresolved.
          Check it again or contact the property.
          Do not create a replacement payment.
        </p>
      )}

      <p>
        <button
          className="checkout-button"
          type="button"
          disabled={state.busy}
          onClick={refresh}
        >
          Check payment records
        </button>
      </p>

      <p className="checkout-note">
        Online checkout is test mode.
        Reservation status and payment status
        are separate. Returning from PayMongo
        does not itself establish payment.
      </p>
    </section>
  );
}