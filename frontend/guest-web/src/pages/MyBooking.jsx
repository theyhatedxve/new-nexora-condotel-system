import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  logoutBookingAccess,
} from "../services/bookingAccessApi.js";

import usePrivateBooking from
  "../hooks/usePrivateBooking.js";

import BookingPayment from
  "../components/BookingPayment.jsx";

import {
  bookingReferenceFromSearch,
} from "../utils/bookingContext.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import "../styles/checkout.css";

const dateTime = new Intl.DateTimeFormat(
  "en-PH",
  {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  },
);

function displayTime(value) {
  return value
    ? dateTime.format(new Date(value))
    : "Not recorded";
}

function MyBookingView({
  expectedReference,
}) {
  const navigate = useNavigate();

  const view = usePrivateBooking(
    expectedReference,
  );

  const [error, setError] = useState("");
  const [signingOut, setSigningOut] =
    useState(false);

  const logoutPending = useRef(false);

  const booking = view.booking;

  async function signOut() {
    if (logoutPending.current) return;

    logoutPending.current = true;
    setSigningOut(true);
    setError("");

    try {
      await logoutBookingAccess();

      navigate(
        "/booking-access",
        { replace: true },
      );
    } catch {
      setError(
        "Sign out could not be confirmed. Please try again.",
      );
    } finally {
      logoutPending.current = false;
      setSigningOut(false);
    }
  }

  const method =
    booking?.paymentPreference === "PAYMONGO"
      ? "PayMongo test checkout"
      : booking?.paymentPreference ===
          "PAY_AT_PROPERTY"
        ? "Pay at Property"
        : "Not recorded";

  return (
    <main className="checkout-page">
      <section className="checkout-panel checkout-receipt">
        <p className="checkout-kicker">
          YOUR NEXORA RESERVATION
        </p>

        <h1>My booking</h1>

        {view.status === "loading" && (
          <p role="status">
            Loading your private booking...
          </p>
        )}

        {view.status === "unavailable" && (
          <p role="status">
            Private access is unavailable, expired,
            or belongs to a different booking.
            Request access to the intended booking.
          </p>
        )}

        {view.status === "error" && (
          <p role="alert">
            This booking could not be loaded.
            Try refreshing its details.
          </p>
        )}

        {booking && (
          <>
            <dl className="checkout-summary">
              <div>
                <dt>Booking reference</dt>
                <dd>
                  {booking.reservationNumber}
                </dd>
              </div>

              <div>
                <dt>Reservation status</dt>
                <dd>
                  {booking.status.replaceAll("_", " ")}
                </dd>
              </div>

              <div>
                <dt>Payment preference</dt>
                <dd>{method}</dd>
              </div>

              <div>
                <dt>Room type</dt>
                <dd>{booking.roomType.name}</dd>
              </div>

              <div>
                <dt>Primary guest</dt>
                <dd>
                  {booking.guest.firstName}{" "}
                  {booking.guest.lastName}
                </dd>
              </div>

              <div>
                <dt>Check-in</dt>
                <dd>
                  {booking.checkInDate.slice(0, 10)}
                </dd>
              </div>

              <div>
                <dt>Check-out</dt>
                <dd>
                  {booking.checkOutDate.slice(0, 10)}
                </dd>
              </div>

              <div>
                <dt>Guests</dt>
                <dd>{booking.guestCount}</dd>
              </div>

              <div>
                <dt>Expected arrival · Philippine time</dt>
                <dd>
                  {displayTime(
                    booking.expectedArrivalAt,
                  )}
                </dd>
              </div>

              {booking.holdExpiresAt && (
                <div>
                  <dt>Hold / confirmation deadline</dt>
                  <dd>
                    {displayTime(
                      booking.holdExpiresAt,
                    )}
                  </dd>
                </div>
              )}

              {booking.paymentPreference ===
                "PAY_AT_PROPERTY" && (
                <>
                  <div>
                    <dt>First staff contact</dt>
                    <dd>
                      {displayTime(
                        booking.firstContactedAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Response deadline</dt>
                    <dd>
                      {displayTime(
                        booking.responseDeadlineAt,
                      )}
                    </dd>
                  </div>
                </>
              )}

              {booking.confirmedAt && (
                <div>
                  <dt>Confirmed at</dt>
                  <dd>
                    {displayTime(
                      booking.confirmedAt,
                    )}
                  </dd>
                </div>
              )}

              <div>
                <dt>Booked nightly rate</dt>
                <dd>
                  {formatPesos(
                    booking.nightlyRateCentavos,
                  )}
                </dd>
              </div>

              <div className="checkout-total">
                <dt>Booked stay total</dt>
                <dd>
                  {formatPesos(
                    booking.totalAmountCentavos,
                  )}
                </dd>
              </div>
            </dl>

            {booking.status === "PENDING" &&
              booking.paymentPreference ===
                "PAY_AT_PROPERTY" && (
                <p className="checkout-note">
                  Staff must contact you and record
                  your agreement before confirmation.
                  The earlier deadline applies:
                  24 hours after first contact or
                  30 minutes after expected arrival.
                </p>
              )}

            {booking.holdExpired && (
              <p role="status" className="checkout-note">
                The pending deadline has passed.
                The displayed reservation state will
                update after deadline processing.
              </p>
            )}

            {["EXPIRED", "CANCELLED"].includes(
              booking.status,
            ) && (
              <p className="checkout-note">
                This booking is closed. It cannot
                be revived by a payment or browser
                redirect.
              </p>
            )}

            <BookingPayment
              key={`${booking.reservationNumber}:${view.revision}`}
              booking={booking}
            />

            <p>
              <button
                className="checkout-button"
                type="button"
                disabled={signingOut}
                onClick={signOut}
              >
                {signingOut
                  ? "Signing out..."
                  : "End private access"}
              </button>
            </p>
          </>
        )}

        {view.status !== "loading" && (
          <p>
            <button
              className="checkout-button"
              type="button"
              disabled={signingOut}
              onClick={view.refresh}
            >
              Refresh booking details
            </button>
          </p>
        )}

        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}

        {!booking && view.status !== "loading" && (
          <Link
            className="checkout-link"
            to="/booking-access"
          >
            Request private email access
          </Link>
        )}
      </section>
    </main>
  );
}

export default function MyBooking() {
  const [params] = useSearchParams();
  const search = params.toString();

  const context = useMemo(() => {
    try {
      return {
        reference:
          bookingReferenceFromSearch(search),
        error: "",
      };
    } catch {
      return {
        reference: null,
        error:
          "The booking context is invalid.",
      };
    }
  }, [search]);

  if (context.error) {
    return (
      <main className="checkout-page">
        <section className="checkout-panel">
          <h1>Booking access unavailable</h1>
          <p role="alert">{context.error}</p>
          <Link to="/booking-access">
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