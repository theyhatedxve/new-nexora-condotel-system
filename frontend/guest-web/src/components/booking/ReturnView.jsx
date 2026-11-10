import { Link } from "react-router";
import usePrivateBooking from "../../hooks/usePrivateBooking.js";
import { ReturnSummary } from "./ReturnSummary.jsx";

export function ReturnView({ reference }) {
  const view = usePrivateBooking(reference);

  return (
    <main className="checkout-page">
      <section className="checkout-panel checkout-receipt">
        <p className="checkout-kicker">PAYMONGO TEST CHECKOUT</p>

        {view.status === "loading" && (
          <>
            <h1>Checking private access</h1>
            <p role="status">Loading the intended booking...</p>
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
            <h1>Payment status unavailable</h1>
            <p role="alert">
              Private access is unavailable, expired, or belongs to another booking.
              Request access to the intended booking.
            </p>
            <Link to="/booking-access">Request private email access</Link>
          </>
        )}

        <p className="checkout-note">
          Return URL parameters never establish payment success. Only verified backend
          records determine the displayed payment.
        </p>
      </section>
    </main>
  );
}
