import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import useBookingAccess from "../hooks/useBookingAccess.js";
import "../styles/booking-access.css";

export default function BookingAccess() {
  const { token, notice, error, busy, openBooking, requestLink } = useBookingAccess();

  return (
    <main className="booking-access">
      <section className="booking-access__card" aria-labelledby="booking-access-title">
        <header className="booking-access__heading">
          <span className="booking-access__icon">
            <ShieldCheck size={28} aria-hidden="true" />
          </span>

          <p className="booking-access__eyebrow">Your stay at NEXORA</p>

          <h1 id="booking-access-title">
            {token ? "Your private booking access" : "Find your booking"}
          </h1>

          <p className="booking-access__intro">
            {token
              ? "Your private link is ready. Select the button below to open your booking."
              : "Enter your booking reference and the email used for your reservation. We will email a private access link if they match."}
          </p>
        </header>

        {token ? (
          <div className="booking-access__open" aria-busy={busy}>
            <button
              className="booking-access__button"
              type="button"
              disabled={busy}
              onClick={openBooking}
            >
              {busy ? "Opening your booking..." : "View my booking"}

              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <p className="booking-access__help">
              Your link is used only when you select this button.
            </p>
          </div>
        ) : (
          <form className="booking-access__form" onSubmit={requestLink} aria-busy={busy}>
            <fieldset className="booking-access__fields" disabled={busy}>
              <legend className="booking-access__legend">Booking details</legend>

              <div className="booking-access__field">
                <label htmlFor="access-reference">Booking reference</label>

                <input
                  id="access-reference"
                  name="reservationNumber"
                  type="text"
                  placeholder="Enter your booking reference"
                  aria-describedby="access-reference-help"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={100}
                  required
                />

                <p id="access-reference-help" className="booking-access__help">
                  Use the reference shown on your booking receipt.
                </p>
              </div>

              <div className="booking-access__field">
                <label htmlFor="access-email">Email address</label>

                <input
                  id="access-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  required
                />
              </div>

              <button className="booking-access__button" type="submit">
                <Mail size={18} aria-hidden="true" />

                {busy ? "Requesting your link..." : "Email me an access link"}
              </button>
            </fieldset>
          </form>
        )}

        {notice && (
          <div className="booking-access__notice" role="status">
            <strong>Check your email</strong>
            <p>{notice}</p>
            <p>If an email arrives, check your inbox and spam folder.</p>
          </div>
        )}

        {error && (
          <div className="booking-access__error" role="alert">
            {error}
          </div>
        )}

        <div className="booking-access__privacy">
          <ShieldCheck size={20} aria-hidden="true" />

          <p>
            Links expire after 15 minutes and can be used once. Private access lasts 30
            minutes. Keep your link to yourself.
          </p>
        </div>

        <footer className="booking-access__footer">
          <Link className="booking-access__back" to="/rooms">
            <ArrowLeft size={16} aria-hidden="true" />
            Return to rooms
          </Link>
        </footer>
      </section>
    </main>
  );
}
