import { Link, useParams } from "react-router";
import useMyBookingContext from "../hooks/useMyBookingContext.js";
import { MyBookingView } from "../components/booking/MyBookingView.jsx";
import "../styles/checkout.css";
import "../styles/my-booking.css";

export default function MyBooking() {
  const { reservationId } = useParams();
  const { context } = useMyBookingContext();

  if (!reservationId && context.error) {
    return (
      <main className="my-booking">
        <section className="my-booking__card">
          <h1>Booking unavailable</h1>

          <p className="my-booking__error" role="alert">
            {context.error}
          </p>

          <Link className="my-booking__button" to="/my-bookings">
            Back to My Bookings
          </Link>
        </section>
      </main>
    );
  }

  return (
    <MyBookingView
      key={reservationId || context.reference || "current"}
      reservationId={reservationId}
      expectedReference={reservationId ? null : context.reference}
    />
  );
}
