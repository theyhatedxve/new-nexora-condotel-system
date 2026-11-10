import { Link } from "react-router";
import usePaymentReturnContext from "../hooks/usePaymentReturnContext.js";
import { ReturnView } from "../components/booking/ReturnView.jsx";
import "../styles/checkout.css";

export default function PaymentReturn() {
  const { context } = usePaymentReturnContext();

  if (context.invalid || !context.reference) {
    return (
      <main className="checkout-page">
        <section className="checkout-panel checkout-receipt">
          <h1>Payment context unavailable</h1>
          <p>
            Open the intended booking through private access to check its verified payment
            records.
          </p>
          <Link to="/my-booking">Open My Booking</Link>
          <p>
            <Link to="/booking-access">Request private email access</Link>
          </p>
        </section>
      </main>
    );
  }

  return <ReturnView key={context.reference} reference={context.reference} />;
}
