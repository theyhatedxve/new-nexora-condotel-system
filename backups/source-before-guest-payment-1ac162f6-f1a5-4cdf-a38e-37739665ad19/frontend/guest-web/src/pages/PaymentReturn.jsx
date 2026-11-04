import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getBookingPaymentSummary } from '../services/bookingPaymentsApi.js';
import '../styles/checkout.css';
export default function PaymentReturn() {
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getBookingPaymentSummary(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSummary(result); })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.response?.status === 404
          ? 'Request a private booking access link to view your payment status.'
          : 'We could not check the payment. Contact the property before paying again.');
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [refresh]);

  // Only authenticated backend records determine this view. Ignore return URL outcomes.
  const paid = summary?.status === 'PAID' && !summary.requiresReview;
  const review = summary?.requiresReview;
  const title = busy ? 'Checking payment' : error ? 'Payment status unavailable'
    : review ? 'Payment needs review' : paid ? 'Full payment recorded' : 'Payment verification pending';
  return (
    <main className="checkout-page">
      <section className="checkout-panel">
        <p className="checkout-kicker">PAYMONGO TEST CHECKOUT</p>
        <h1 aria-live="polite">{title}</h1>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        {!busy && !error && <p>{review
          ? 'Contact the property before making another payment.'
          : paid ? 'The backend has recorded full payment. Reception still completes check-in.'
          : 'Payment is not yet recorded in full. Check again or contact the property before paying again.'}</p>}
        <p>Returning from checkout does not itself confirm payment.</p>
        <p><button className="checkout-button" type="button" disabled={busy}
          onClick={() => { setBusy(true); setSummary(null); setError(''); setRefresh((value) => value + 1); }}>Check payment status</button></p>
        <Link className="checkout-link" to="/my-booking">View my booking</Link>
      </section>
    </main>
  );
}
