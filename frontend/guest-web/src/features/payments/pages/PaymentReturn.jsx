import { Link } from "react-router";
import { ArrowLeft, CreditCard } from "lucide-react";

import usePaymentReturnContext from "../hooks/usePaymentReturnContext.js";
import { ReturnView } from "../components/ReturnView.jsx";

import "../../checkout/styles/checkout.css";
import "../styles/payment-return.css";

export default function PaymentReturn() {
  const { context } = usePaymentReturnContext();

  if (context.invalid || !context.reference) {
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

          <h1 id="payment-return-title">
            Payment context unavailable
          </h1>

          <p className="payment-return__message">
            The intended reservation could not be identified.
            Keep your booking reference and contact the property
            before starting another payment.
          </p>

          <div className="payment-return__actions">
            <Link
              className="payment-return__primary"
              to="/my-bookings"
            >
              View My Bookings
            </Link>

            <Link
              className="payment-return__secondary"
              to="/rooms"
            >
              Browse Rooms
            </Link>
          </div>
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