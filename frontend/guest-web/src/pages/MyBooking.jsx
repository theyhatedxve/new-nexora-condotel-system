import { Link } from "react-router";

import useMyBookingContext from "../hooks/useMyBookingContext.js";
import { MyBookingView } from "../components/booking/MyBookingView.jsx";

import "../styles/checkout.css";
import "../styles/my-booking.css";
import "../styles/my-booking-luxury.css";

export default function MyBooking() {
  const { context } = useMyBookingContext();

  if (context.error) {
    return (
      <main
        className="my-booking"
        aria-labelledby="booking-unavailable-title"
      >
        <section className="my-booking__card">
          <p className="my-booking__eyebrow">
            Your stay at NEXORA
          </p>

          <h1 id="booking-unavailable-title">
            Booking unavailable
          </h1>

          <p className="my-booking__error" role="alert">
            {context.error}
          </p>

          <Link
            className="my-booking__button"
            to="/my-bookings"
          >
            Back to My Bookings
          </Link>
        </section>
      </main>
    );
  }

  return (
    <MyBookingView
      key={
        context.reservationId ||
        context.reference ||
        "current"
      }
      reservationId={context.reservationId}
      expectedReference={context.reference}
    />
  );
}