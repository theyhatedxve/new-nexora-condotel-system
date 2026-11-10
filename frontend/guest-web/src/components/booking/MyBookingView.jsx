import { Link } from "react-router";
import { ArrowLeft, CalendarDays, LogOut, RefreshCw } from "lucide-react";
import BookingPayment from "../BookingPayment.jsx";
import { formatPesos } from "../../utils/formatMoney.js";
import useMyBookingView from "../../hooks/useMyBookingView.js";
import { displayTime } from "../../utils/bookingDisplayTime.js";
import { SummaryRow } from "./SummaryRow.jsx";

export function MyBookingView({ expectedReference }) {
  const { view, error, signingOut, booking, signOut, method, propertyPending, closed } =
    useMyBookingView({ expectedReference });

  return (
    <main className="my-booking">
      <header className="my-booking__heading">
        <div>
          <p className="my-booking__eyebrow">Your stay at NEXORA</p>

          <h1>My booking</h1>

          <p className="my-booking__intro">
            Review your stay, booking status, and recorded payments.
          </p>
        </div>

        {view.status !== "loading" && (
          <button
            className="my-booking__button"
            type="button"
            disabled={signingOut}
            onClick={view.refresh}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh details
          </button>
        )}
      </header>

      {view.status === "loading" && (
        <div className="my-booking__feedback" role="status">
          Loading your private booking...
        </div>
      )}

      {view.status === "unavailable" && (
        <div className="my-booking__feedback" role="status">
          Private access is unavailable, expired, or belongs to a different booking.
          Request access to the intended booking.
        </div>
      )}

      {view.status === "error" && (
        <div className="my-booking__feedback" role="alert">
          This booking could not be loaded. Try refreshing its details.
        </div>
      )}

      {booking && (
        <>
          <section className="my-booking__identity" aria-labelledby="my-booking-room">
            <div className="my-booking__identity-main">
              <span className="my-booking__icon">
                <CalendarDays size={26} aria-hidden="true" />
              </span>

              <div className="my-booking__identity-text">
                <p className="my-booking__label">Booking reference</p>

                <p className="my-booking__reference">{booking.reservationNumber}</p>

                <h2 id="my-booking-room">{booking.roomType.name}</h2>
              </div>
            </div>

            <div className="my-booking__status-group">
              <span className="my-booking__label">Reservation status</span>

              <span className="my-booking__status" data-status={booking.status}>
                {booking.status.replaceAll("_", " ")}
              </span>
            </div>
          </section>

          <div className="my-booking__grid">
            <section className="my-booking__card" aria-labelledby="my-booking-stay">
              <h2 id="my-booking-stay">Your stay</h2>

              <p className="my-booking__section-intro">
                Booking dates and guest details. Times use Philippine time.
              </p>

              <dl className="my-booking__summary">
                <SummaryRow label="Check-in">
                  {booking.checkInDate.slice(0, 10)}
                </SummaryRow>

                <SummaryRow label="Check-out">
                  {booking.checkOutDate.slice(0, 10)}
                </SummaryRow>

                <SummaryRow label="Guests">{booking.guestCount}</SummaryRow>

                <SummaryRow label="Primary guest">
                  {booking.guest.firstName} {booking.guest.lastName}
                </SummaryRow>

                <SummaryRow label="Expected arrival">
                  {displayTime(booking.expectedArrivalAt)}
                </SummaryRow>

                <SummaryRow label="Payment preference">{method}</SummaryRow>

                <SummaryRow label="Booked nightly rate">
                  {formatPesos(booking.nightlyRateCentavos)}
                </SummaryRow>
              </dl>

              <div className="my-booking__total">
                <span>Booked stay total</span>

                <strong>{formatPesos(booking.totalAmountCentavos)}</strong>
              </div>
            </section>

            <BookingPayment
              key={`${booking.reservationNumber}:${view.revision}`}
              booking={booking}
            />
          </div>

          <section
            className="my-booking__card my-booking__timing"
            aria-labelledby="my-booking-timing"
          >
            <h2 id="my-booking-timing">Booking updates and deadlines</h2>

            <p className="my-booking__section-intro">
              All times below use Philippine time.
            </p>

            <dl className="my-booking__summary">
              {booking.holdExpiresAt && (
                <SummaryRow label="Hold / confirmation deadline">
                  {displayTime(booking.holdExpiresAt)}
                </SummaryRow>
              )}

              {booking.paymentPreference === "PAY_AT_PROPERTY" && (
                <>
                  <SummaryRow label="First staff contact">
                    {displayTime(booking.firstContactedAt)}
                  </SummaryRow>

                  <SummaryRow label="Response deadline">
                    {displayTime(booking.responseDeadlineAt)}
                  </SummaryRow>
                </>
              )}

              <SummaryRow label="Confirmed at">
                {displayTime(booking.confirmedAt)}
              </SummaryRow>
            </dl>

            {propertyPending && (
              <p className="my-booking__notice">
                Staff must contact you and record your agreement before confirmation. The
                earlier deadline applies: 24 hours after first contact or 30 minutes after
                expected arrival.
              </p>
            )}

            {booking.holdExpired && (
              <p className="my-booking__notice" role="status">
                The pending deadline has passed. The displayed reservation state will
                update after deadline processing.
              </p>
            )}

            {closed && (
              <p className="my-booking__notice">
                This booking is closed. It cannot be revived by a payment or browser
                redirect.
              </p>
            )}
          </section>

          <footer className="my-booking__actions">
            <Link className="my-booking__back" to="/rooms">
              <ArrowLeft size={17} aria-hidden="true" />
              Return to rooms
            </Link>

            <button
              className="my-booking__button"
              type="button"
              disabled={signingOut}
              onClick={signOut}
            >
              <LogOut size={17} aria-hidden="true" />

              {signingOut ? "Signing out..." : "End private access"}
            </button>
          </footer>
        </>
      )}

      {error && (
        <p className="my-booking__error" role="alert">
          {error}
        </p>
      )}

      {!booking && view.status !== "loading" && (
        <Link className="my-booking__button" to="/booking-access">
          Request private email access
        </Link>
      )}
    </main>
  );
}
