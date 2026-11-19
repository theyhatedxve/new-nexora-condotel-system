import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import useGuestBookings from "../hooks/useGuestBookings.js";
import { formatPesos } from "../utils/formatMoney.js";
import {
  formatRentalTime,
  rentalCaption,
} from "../utils/rentalStay.js";

import "../styles/my-bookings.css";

const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

function paymentMethodLabel(preference) {
  if (preference === "PAYMONGO") return "PayMongo test checkout";
  if (preference === "PAY_AT_PROPERTY") return "Pay at Property";
  return "Not recorded";
}

function BookingCard({ item }) {
  const typedStay = Boolean(item.rentalType);

  const arrival = typedStay
    ? formatRentalTime(
        item.actualArrivalAt || item.scheduledArrivalAt,
      )
    : item.checkInDate.slice(0, 10);

  const departure = typedStay
    ? formatRentalTime(
        item.actualDepartureAt || item.inventoryEndAt,
      )
    : item.checkOutDate.slice(0, 10);

  const arrivalLabel = typedStay
    ? item.actualArrivalAt
      ? "Actual arrival"
      : "Scheduled arrival"
    : "Check-in date";

  const departureLabel = typedStay
    ? item.actualDepartureAt
      ? "Actual departure"
      : "Recorded departure"
    : "Check-out date";

  return (
    <article
      className="my-bookings__card"
      aria-labelledby={`booking-title-${item.id}`}
    >
      <header className="my-bookings__card-top">
        <span className="my-bookings__icon" aria-hidden="true">
          <BedDouble size={27} />
        </span>

        <div className="my-bookings__card-info">
          <h2 id={`booking-title-${item.id}`}>
            {item.roomType.name}
          </h2>
          <p className="my-bookings__reference">
            Reference: {item.reservationNumber}
          </p>
        </div>

        <span
          className="my-bookings__status"
          data-status={item.status}
        >
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </header>

      <dl className="my-bookings__details">
        <div>
          <dt>{arrivalLabel}</dt>
          <dd>{arrival}</dd>
        </div>

        <div>
          <dt>{departureLabel}</dt>
          <dd>{departure}</dd>
        </div>

        {typedStay && (
          <div>
            <dt>Booked duration</dt>
            <dd>{rentalCaption(item)}</dd>
          </div>
        )}

        <div>
          <dt>Guests</dt>
          <dd>
            {item.guestCount}{" "}
            {item.guestCount === 1 ? "guest" : "guests"}
          </dd>
        </div>

        <div>
          <dt>Payment preference</dt>
          <dd>{paymentMethodLabel(item.paymentPreference)}</dd>
        </div>
      </dl>

      <footer className="my-bookings__card-footer">
        <div>
          <p className="my-bookings__total-label">
            Reservation total
          </p>
          <p className="my-bookings__total">
            {formatPesos(item.totalAmountCentavos)}
          </p>
        </div>

        <Link
          className="my-bookings__view"
          to={`/my-bookings/${encodeURIComponent(item.id)}`}
          aria-label={`View booking ${item.reservationNumber}`}
        >
          View Booking
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export default function MyBookings() {
  const {
    status,
    items,
    total,
    page,
    totalPages,
    goToPage,
    refresh,
  } = useGuestBookings();

  const loaded = status === "ready" || status === "empty";
  const emptyPage = status === "empty" && page > 1;
  const showPagination = loaded && (totalPages > 1 || page > 1);

  return (
    <main
      className="my-bookings"
      aria-labelledby="my-bookings-title"
    >
      <header className="my-bookings__heading">
        <div>
          <p className="my-bookings__eyebrow">
            Your stay at NEXORA
          </p>
          <h1 id="my-bookings-title">My Bookings</h1>

          <p className="my-bookings__intro">
            {loaded
              ? `${total} reservation${total === 1 ? "" : "s"} on your guest account.`
              : "View your reservations and review your stay details."}
          </p>
        </div>

        <div className="my-bookings__actions">
          <button
            type="button"
            className="my-bookings__refresh"
            onClick={refresh}
            disabled={status === "loading"}
          >
            <RefreshCw size={17} aria-hidden="true" />
            {status === "loading" ? "Refreshing…" : "Refresh"}
          </button>

          <Link className="my-bookings__explore" to="/rooms">
            Explore Rooms
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="my-bookings__notice">
        <CalendarDays size={21} aria-hidden="true" />
        <p>
          Stay times use Philippine time. Open a booking to review
          payment status and available actions. Reservation status
          and payment status are separate.
        </p>
      </div>

      {status === "loading" && (
        <div className="my-bookings__feedback" role="status">
          <CalendarDays size={32} aria-hidden="true" />
          <h2>Loading your bookings</h2>
          <p>Please wait while we retrieve your reservations.</p>
        </div>
      )}

      {status === "error" && (
        <div
          className="my-bookings__feedback my-bookings__feedback--error"
          role="alert"
        >
          <h2>We could not load your bookings</h2>
          <p>Please try again to retrieve the latest information.</p>

          <button
            type="button"
            className="my-bookings__refresh"
            onClick={refresh}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="my-bookings__feedback" role="status">
          <CalendarDays size={32} aria-hidden="true" />

          <h2>
            {emptyPage
              ? "No bookings on this page"
              : "Your next stay starts here"}
          </h2>

          <p>
            {emptyPage
              ? "Return to the previous page or refresh your reservations."
              : "You have no reservations on this guest account yet."}
          </p>

          {!emptyPage && (
            <Link className="my-bookings__explore" to="/rooms">
              Explore Rooms
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      {status === "ready" && (
        <ul
          className="my-bookings__list"
          aria-label="Your reservations"
        >
          {items.map((item) => (
            <li key={item.id}>
              <BookingCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {showPagination && (
        <nav
          className="my-bookings__pagination"
          aria-label="Booking pages"
        >
          <button
            type="button"
            className="my-bookings__page-btn"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Previous
          </button>

          <span
            className="my-bookings__page-info"
            aria-live="polite"
          >
            Page {page}
            {totalPages >= page ? ` of ${totalPages}` : ""}
          </span>

          <button
            type="button"
            className="my-bookings__page-btn"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </nav>
      )}
    </main>
  );
}