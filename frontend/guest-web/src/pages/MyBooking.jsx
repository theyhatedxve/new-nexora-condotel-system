import { Link } from "react-router";
import useMyBookingContext from "../hooks/useMyBookingContext.js";
import { MyBookingView } from "../components/booking/MyBookingView.jsx";
import "../styles/checkout.css";
import "../styles/my-booking.css";

export default function MyBooking() {
  const { context } = useMyBookingContext();

  if (context.error) {
    return (
      <main className="my-booking">
        <section className="my-booking__card">
          <h1>Booking access unavailable</h1>

          <p className="my-booking__error" role="alert">
            {context.error}
          </p>

          <Link className="my-booking__button" to="/booking-access">
            Request private email access
          </Link>
        </section>
      </main>
    );
  }

  return (
    <MyBookingView
      key={context.reference || "current"}
      expectedReference={context.reference}
    />
  );
}
