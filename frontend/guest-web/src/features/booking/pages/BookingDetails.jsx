import { Link } from "react-router";

import useBookingDetailsContext from "../hooks/useBookingDetailsContext.js";
import { BookingDetailsView } from "../components/BookingDetailsView.jsx";

import "../../checkout/styles/checkout.css";
import "../styles/booking-details.css";
import "../styles/booking-details-luxury.css";

export default function BookingDetails() {
  const { context } = useBookingDetailsContext();

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
    <BookingDetailsView
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