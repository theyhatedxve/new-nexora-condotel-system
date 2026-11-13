import { Link } from "react-router";
import usePaymentReturnContext from "../hooks/usePaymentReturnContext";
import { ReturnView } from "../components/booking/ReturnView";
import "../styles/checkout.css";

export default function PaymentReturn() {
  const { context } = usePaymentReturnContext();
  if (context.invalid || !context.reference) {
    return (
      <main className="checkout-page">
        <section className="checkout-panel checkout-receipt">
          <h1>Payment context unavailable</h1>
          <p>
            The intended reservation could not be identified.
            Keep your booking reference and contact the property
            before starting another payment.
          </p>
          <Link to="/rooms">Browse rooms</Link>
        </section>
      </main>
    );
  }
  return <ReturnView key={context.reference} reference={context.reference} />;
}
