import { Link, useSearchParams } from "react-router";
import useGuestBookings from "../hooks/useGuestBookings.js";
import { formatPesos } from "../utils/formatMoney.js";
import "../styles/my-bookings.css";

export default function MyBookings() {
  const [params, setParams] = useSearchParams();
  const suppliedPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(suppliedPage) && suppliedPage >= 1 && suppliedPage <= 10000
      ? suppliedPage
      : 1;
  const { status, data, refresh } = useGuestBookings(page);
  const loading = status === "loading";

  function changePage(nextPage) {
    setParams({ page: String(nextPage) });
  }

  return (
    <main className="my-bookings">
      <header className="my-bookings__heading">
        <div>
          <h1>My Bookings</h1>
          <p>View your reservations and stay details.</p>
        </div>
        <button
          className="my-bookings__button"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      {loading && (
        <p className="my-bookings__feedback" role="status">
          Loading your bookings…
        </p>
      )}

      {status === "error" && (
        <div className="my-bookings__feedback" role="alert">
          <p>Your bookings could not be loaded.</p>
          <button className="my-bookings__button" type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {status === "ready" && data.items.length === 0 && (
        <div className="my-bookings__feedback">
          <p>You have no bookings yet.</p>
          <Link className="my-bookings__button" to="/rooms">
            Explore rooms
          </Link>
        </div>
      )}

      {status === "ready" && data.items.length > 0 && (
        <>
          <ul className="my-bookings__list">
            {data.items.map((booking) => (
              <li key={booking.id} className="my-bookings__card">
                <div className="my-bookings__card-heading">
                  <div>
                    <h2>{booking.roomType.name}</h2>
                    <p className="my-bookings__reference">{booking.reservationNumber}</p>
                  </div>
                  <span className="my-bookings__status" data-status={booking.status}>
                    {booking.status.replaceAll("_", " ")}
                  </span>
                </div>
                <dl className="my-bookings__details">
                  <div>
                    <dt>Check-in</dt>
                    <dd>{booking.checkInDate.slice(0, 10)}</dd>
                  </div>
                  <div>
                    <dt>Check-out</dt>
                    <dd>{booking.checkOutDate.slice(0, 10)}</dd>
                  </div>
                  <div>
                    <dt>Guests</dt>
                    <dd>{booking.guestCount}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{formatPesos(booking.totalAmountCentavos)}</dd>
                  </div>
                </dl>
                <Link
                  className="my-bookings__button"
                  to={`/my-bookings/${encodeURIComponent(booking.id)}`}
                  aria-label={`View booking ${booking.reservationNumber}`}
                >
                  View details
                </Link>
              </li>
            ))}
          </ul>
          <nav className="my-bookings__pagination" aria-label="Booking pages">
            <button
              className="my-bookings__button"
              type="button"
              disabled={data.page <= 1}
              onClick={() => changePage(data.page - 1)}
            >
              Previous
            </button>
            <span aria-live="polite">Page {data.page} of {data.totalPages}</span>
            <button
              className="my-bookings__button"
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => changePage(data.page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
