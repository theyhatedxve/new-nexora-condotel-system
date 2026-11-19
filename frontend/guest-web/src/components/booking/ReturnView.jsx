import { Link } from "react-router";
import { ArrowLeft, CreditCard } from "lucide-react";

import usePrivateBooking from "../../hooks/usePrivateBooking.js";
import { ReturnSummary } from "./ReturnSummary.jsx";

export function ReturnView({ reference }) {
  const view = usePrivateBooking(reference);

  return (
    <main
      className="checkout-page payment-return"
      aria-labelledby="payment-return-title"
    >
      <Link
        className="payment-return__back"
        to="/my-bookings"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to My Bookings
      </Link>

      <section className="checkout-panel payment-return__card">
        <span
          className="payment-return__icon"
          aria-hidden="true"
        >
          <CreditCard size={30} />
        </span>

        <p className="payment-return__eyebrow">
          PayMongo test checkout
        </p>

        {view.status === "loading" && (
          <>
            <h1 id="payment-return-title">
              Checking your booking
            </h1>
            <p
              className="payment-return__message"
              role="status"
            >
              Loading the intended booking. Payment has not yet
              been verified on this page.
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

        {["unavailable", "error"].includes(view.status) && (
          <>
            <h1 id="payment-return-title">
              Payment status unavailable
            </h1>

            <p
              className="payment-return__error"
              role="alert"
            >
              This reservation could not be loaded for your guest
              account. Check its reference or contact the property
              before paying again.
            </p>

            <div className="payment-return__actions">
              <button
                className="payment-return__secondary"
                type="button"
                onClick={view.refresh}
              >
                Try Again
              </button>

              <Link
                className="payment-return__primary"
                to="/my-bookings"
              >
                View My Bookings
              </Link>
            </div>
          </>
        )}

        <p className="payment-return__verification">
          Returning from PayMongo does not establish payment
          success. Only verified backend records determine the
          displayed payment status.
        </p>
      </section>
    </main>
  );
}