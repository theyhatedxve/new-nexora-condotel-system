import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  exchangeBookingAccess,
  requestBookingAccess,
} from "../services/bookingAccessApi.js";

import "../styles/checkout.css";

export default function BookingAccess() {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => {
    return new URLSearchParams(
      window.location.hash.slice(1),
    ).get("token") || "";
  });

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    // Opening the page does not consume the link.
    // Keep the token in memory only.
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname +
          window.location.search,
      );
    }
  }, []);

  async function openBooking() {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      if (!/^[a-f0-9]{64}$/.test(token)) {
        throw new Error("Invalid link");
      }

      await exchangeBookingAccess(token);
      setToken("");

      navigate("/my-booking", {
        replace: true,
      });
    } catch {
      setToken("");
      setError(
        "This link could not be used. Request a new link and try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function requestLink(event) {
    event.preventDefault();

    if (submitting.current) return;

    const form = new FormData(event.currentTarget);

    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await requestBookingAccess({
        reservationNumber: String(
          form.get("reservationNumber"),
        ).trim(),
        email: String(
          form.get("email"),
        ).trim(),
      });

      setNotice(result.message);
    } catch (failure) {
      setError(
        failure.response?.status === 429
          ? "Please wait one minute before requesting another link."
          : "We could not process the request. Check your details and try again later.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="checkout-page">
      <section className="checkout-panel checkout-receipt">
        <p className="checkout-kicker">
          PRIVATE BOOKING ACCESS
        </p>

        <h1>Access your booking</h1>

        {token ? (
          <>
            <p>
              Select the button below to use your
              private access link.
            </p>

            <button
              className="checkout-button"
              type="button"
              disabled={busy}
              onClick={openBooking}
            >
              {busy
                ? "Opening your booking…"
                : "View my booking"}
            </button>
          </>
        ) : (
          <>
            <p>
              Enter your booking reference and the email
              address used for the reservation. We will
              send a private access link if they match.
            </p>

            <form
              onSubmit={requestLink}
              aria-busy={busy}
            >
              <fieldset
                className="checkout-fields"
                disabled={busy}
              >
                <legend className="checkout-legend">
                  Request a private link
                </legend>

                <label htmlFor="access-reference">
                  Booking reference
                </label>

                <input
                  id="access-reference"
                  name="reservationNumber"
                  maxLength={100}
                  required
                />

                <label htmlFor="access-email">
                  Booking email
                </label>

                <input
                  id="access-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />

                <button
                  className="checkout-button"
                  type="submit"
                >
                  {busy
                    ? "Requesting link…"
                    : "Email me an access link"}
                </button>
              </fieldset>
            </form>

            <p className="checkout-note">
              Links expire after 15 minutes and can be
              used once. Access lasts 30 minutes.
              Do not share your link.
            </p>
          </>
        )}

        {notice && (
          <p role="status">{notice}</p>
        )}

        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}

        <Link className="checkout-link" to="/rooms">
          Return to rooms
        </Link>
      </section>
    </main>
  );
}