import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getCurrentBooking, logoutBookingAccess } from '../services/bookingAccessApi.js';
import { formatPesos } from '../utils/formatMoney.js';
import '../styles/checkout.css';
import BookingPayment from '../components/BookingPayment.jsx';

export default function MyBooking() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', booking: null });
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const logoutPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    getCurrentBooking(controller.signal)
      .then((booking) => {
        if (!controller.signal.aborted) setState({ status: 'ready', booking });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setState({ status: failure.response?.status === 404 ? 'expired' : 'error', booking: null });
        }
      });
    return () => controller.abort();
  }, [retry]);

  const booking = state.booking;
  useEffect(() => {
    if (!booking) return;
    const expiresAt = new Date(booking.accessExpiresAt).getTime();
    const expire = () => {
      if (Date.now() >= expiresAt) setState({ status: 'expired', booking: null });
    };
    const timer = window.setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    window.addEventListener('focus', expire);
    document.addEventListener('visibilitychange', expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', expire);
      document.removeEventListener('visibilitychange', expire);
    };
  }, [booking]);

  async function signOut() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true);
    setError('');
    try {
      await logoutBookingAccess();
      navigate('/booking-access', { replace: true });
    } catch {
      setError('We could not confirm sign out. Please try again.');
    } finally {
      logoutPending.current = false;
      setSigningOut(false);
    }
  }

  return (
    <main className="checkout-page">
      <section className="checkout-panel checkout-receipt">
        <p className="checkout-kicker">YOUR NEXORA RESERVATION</p>
        <h1>My booking</h1>
        {state.status === 'loading' && <p role="status">Loading your booking…</p>}
        {state.status === 'expired' && <p role="status">Your private access is unavailable or has expired. Request a new email link to continue.</p>}
        {state.status === 'error' && (
          <div role="alert">
            <p>We could not load your booking.</p>
            <button className="checkout-button" type="button" onClick={() => {
              setState({ status: 'loading', booking: null });
              setRetry((value) => value + 1);
            }}>Try again</button>
          </div>
        )}
        {booking && (
          <>
            <dl className="checkout-summary">
              <div><dt>Booking reference</dt><dd>{booking.reservationNumber}</dd></div>
              <div><dt>Status</dt><dd>{booking.status.replaceAll('_', ' ')}</dd></div>
              <div><dt>Room type</dt><dd>{booking.roomType.name}</dd></div>
              <div><dt>Primary guest</dt><dd>{booking.guest.firstName} {booking.guest.lastName}</dd></div>
              <div><dt>Check-in</dt><dd>{booking.checkInDate.slice(0, 10)}</dd></div>
              <div><dt>Check-out</dt><dd>{booking.checkOutDate.slice(0, 10)}</dd></div>
              <div><dt>Guests</dt><dd>{booking.guestCount}</dd></div>
              <div><dt>Booked nightly rate</dt><dd>{formatPesos(booking.nightlyRateCentavos)}</dd></div>
              <div><dt>Booked stay total</dt><dd>{formatPesos(booking.totalAmountCentavos)}</dd></div>
            </dl>
            {booking.status === 'CONFIRMED' && <BookingPayment />}
            <p className="checkout-note">Reservation status does not establish payment status. Contact the property for payment or booking assistance.</p>
            <button className="checkout-button" type="button" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'End private access'}
            </button>
          </>
        )}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        {!booking && state.status !== 'loading' && <Link className="checkout-link" to="/booking-access">Request an access link</Link>}
      </section>
    </main>
  );
}
