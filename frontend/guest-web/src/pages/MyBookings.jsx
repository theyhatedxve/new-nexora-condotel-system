import { Link } from "react-router";
import { CalendarDays, RefreshCw } from "lucide-react";
import useGuestBookings from "../hooks/useGuestBookings.js";
import { formatPesos } from "../utils/formatMoney.js";
import "../styles/my-bookings.css";

function paymentMethodLabel(preference) {
  if (preference === "PAYMONGO") return "PayMongo test checkout";
  if (preference === "PAY_AT_PROPERTY") return "Pay at Property";
  return "Not recorded";
}

export default function MyBookings() {
  const { status, items, total, page, totalPages, goToPage, refresh } =
    useGuestBookings();

  return (
    <main className="my-bookings">
      <header className="my-bookings__heading">
        <div>
          <p className="my-bookings__eyebrow">Your stay at NEXORA</p>
          <h1>My Bookings</h1>
          {status === "ready" && (
            <p className="my-bookings__intro">
              {total} reservation{total !== 1 ? "s" : ""} on your guest account.
            </p>
          )}
        </div>

        <button
          type="button"
          className="my-bookings__refresh"
          onClick={refresh}
          disabled={status === "loading"}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {status === "loading" && (
        <div className="my-bookings__feedback" role="status">
          Loading your bookings...
        </div>
      )}

      {status === "error" && (
        <div
          className="my-bookings__feedback my-bookings__feedback--error"
          role="alert"
        >
          Your bookings could not be loaded. Try refreshing the list.
        </div>
      )}

      {status === "empty" && (
        <div className="my-bookings__feedback" role="status">
          <p>You have no reservations on this guest account yet.</p>
          <Link className="my-bookings__action" to="/rooms">
            Explore rooms
          </Link>
        </div>
      )}

      {status === "ready" && (
        <>
          <ul className="my-bookings__list" aria-label="Your reservations">
            {items.map((item) => (
              <li key={item.id} className="my-bookings__item">
                <Link
                  to={`/my-bookings/${encodeURIComponent(item.id)}`}
                  className="my-bookings__card"
                >
                  <div className="my-bookings__card-top">
                    <span className="my-bookings__icon">
                      <CalendarDays size={20} aria-hidden="true" />
                    </span>

                    <div className="my-bookings__card-info">
                      <h2 className="my-bookings__room">{item.roomType.name}</h2>
                      <p className="my-bookings__reference">
                        Ref: {item.reservationNumber}
                      </p>
                    </div>

                    <span
                      className="my-bookings__status"
                      data-status={item.status}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <dl className="my-bookings__details">
                    <div className="my-bookings__detail">
                      <dt>Check-in</dt>
                      <dd>{item.checkInDate.slice(0, 10)}</dd>
                    </div>

                    <div className="my-bookings__detail">
                      <dt>Check-out</dt>
                      <dd>{item.checkOutDate.slice(0, 10)}</dd>
                    </div>

                    <div className="my-bookings__detail">
                      <dt>Guests</dt>
                      <dd>{item.guestCount}</dd>
                    </div>

                    <div className="my-bookings__detail">
                      <dt>Payment preference</dt>
                      <dd>{paymentMethodLabel(item.paymentPreference)}</dd>
                    </div>

                    <div className="my-bookings__detail">
                      <dt>Total</dt>
                      <dd>{formatPesos(item.totalAmountCentavos)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="my-bookings__pagination" aria-label="Booking pages">
              <button
                type="button"
                className="my-bookings__page-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>

              <span className="my-bookings__page-info">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="my-bookings__page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
