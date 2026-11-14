import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useGuestAuth } from "../auth/useGuestAuth";
import GuestSessionState from "../components/GuestSessionState";
import "../styles/guest-auth.css";

export default function BookingAccess() {
  const auth = useGuestAuth();
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  function openBooking(event) {
    event.preventDefault();
    const value = reference.trim();
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
      setError("Enter a valid booking reference.");
      return;
    }
    navigate("/my-booking?booking=" + encodeURIComponent(value));
  }

  return (
    <section className="guest-auth" aria-labelledby="account-booking-access-title">
      <header className="guest-auth__heading">
        <h1 id="account-booking-access-title">Open your booking</h1>
        <p>Use your guest account to view your reservation.</p>
      </header>
      <div className="guest-auth__card">
        <GuestSessionState />
        {auth.status === "anonymous" && (
          <Link to="/login?returnTo=%2Fbooking-access">Sign in to your account</Link>
        )}
        {auth.status === "authenticated" && auth.user.role === "GUEST" && (
          <form onSubmit={openBooking}>
            <label htmlFor="account-booking-reference">Booking reference</label>
            <input
              id="account-booking-reference"
              required
              maxLength={100}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <button type="submit">View booking</button>
            {error && <p role="alert">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
