import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import usePrivateBooking from
  "../hooks/usePrivateBooking.js";

import {
  getGuestBookingPaymentSummary,
} from "../services/guestBookingApi.js";

import {
  loadBookingAttempt,
} from "../utils/bookingAttempt.js";

import {
  bookingReferenceFromSearch,
  getBookingApiScope,
} from "../utils/bookingContext.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import "../styles/checkout.css";

function ReturnSummary({
  booking,
  onRefresh,
}) {
  const [state, setState] = useState({
    status: "loading",
    summary: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getGuestBookingPaymentSummary(
      booking.reservationNumber,
      controller.signal,
    )
      .then((summary) => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            summary,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            summary: null,
          });
        }
      });

    return () => controller.abort();
  }, [booking.reservationNumber]);

  const summary = state.summary;

  const paid =
    summary?.status === "PAID" &&
    !summary.requiresReview;

  const closed =
    summary &&
    ["CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(
      summary.reservationStatus,
    );

  const title =
    state.status === "loading"
      ? "Checking payment"
      : state.status === "error"
        ? "Payment status unavailable"
        : summary.requiresReview
          ? "Payment needs review"
          : paid
            ? "Full payment recorded"
            : closed
              ? "Booking is closed"
              : "Payment verification pending";

  return (
    <>
      <h1 aria-live="polite">{title}</h1>

      <p>
        Booking reference:{" "}
        <strong>
          {booking.reservationNumber}
        </strong>
      </p>

      {state.status === "error" && (
        <p className="checkout-error" role="alert">
          Payment records could not be verified
          for this booking. Contact the property
          before paying again.
        </p>
      )}

      {summary && (
        <>
          <dl className="checkout-summary">
            <div>
              <dt>Reservation status</dt>
              <dd>
                {summary.reservationStatus.replaceAll("_", " ")}
              </dd>
            </div>

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
          </dl>

          <p className="checkout-note">
            {summary.requiresReview
              ? "Contact the property before making another payment."
              : paid
                ? "Full payment is recorded by the backend. Reception still completes check-in."
                : closed
                  ? "This booking is closed. A payment or redirect cannot revive it."
                  : "Full payment has not been verified. Check again before attempting another payment."}
          </p>
        </>
      )}

      <p>
        <button
          className="checkout-button"
          type="button"
          disabled={state.status === "loading"}
          onClick={onRefresh}
        >
          Check payment status
        </button>
      </p>

      <Link
        className="checkout-link"
        to={
          "/my-booking?booking=" +
          encodeURIComponent(
            booking.reservationNumber,
          )
        }
      >
        View this booking
      </Link>
    </>
  );
}

function ReturnView({ reference }) {
  const view = usePrivateBooking(reference);

  return (
    <main className="checkout-page">
      <section className="checkout-panel checkout-receipt">
        <p className="checkout-kicker">
          PAYMONGO TEST CHECKOUT
        </p>

        {view.status === "loading" && (
          <>
            <h1>Checking private access</h1>
            <p role="status">
              Loading the intended booking...
            </p>
          </>
        )}

        {view.status === "ready" && (
          <ReturnSummary
            key={`${reference}:${view.revision}`}
            booking={view.booking}
            onRefresh={view.refresh}
          />
        )}

        {["unavailable", "error"].includes(
          view.status,
        ) && (
          <>
            <h1>Payment status unavailable</h1>
            <p role="alert">
              Private access is unavailable,
              expired, or belongs to another booking.
              Request access to the intended booking.
            </p>
            <Link to="/booking-access">
              Request private email access
            </Link>
          </>
        )}

        <p className="checkout-note">
          Return URL parameters never establish
          payment success. Only verified backend
          records determine the displayed payment.
        </p>
      </section>
    </main>
  );
}

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const search = params.toString();

  const [storedReference] = useState(() => {
    try {
      return loadBookingAttempt(
        getBookingApiScope(),
      )?.reservationNumber || null;
    } catch {
      return null;
    }
  });

  const context = useMemo(() => {
    try {
      return {
        reference:
          bookingReferenceFromSearch(search) ||
          storedReference,
        invalid: false,
      };
    } catch {
      return {
        reference: null,
        invalid: true,
      };
    }
  }, [
    search,
    storedReference,
  ]);

  if (
    context.invalid ||
    !context.reference
  ) {
    return (
      <main className="checkout-page">
        <section className="checkout-panel checkout-receipt">
          <h1>Payment context unavailable</h1>
          <p>
            Open the intended booking through
            private access to check its verified
            payment records.
          </p>
          <Link to="/my-booking">
            Open My Booking
          </Link>
          <p>
            <Link to="/booking-access">
              Request private email access
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <ReturnView
      key={context.reference}
      reference={context.reference}
    />
  );
}