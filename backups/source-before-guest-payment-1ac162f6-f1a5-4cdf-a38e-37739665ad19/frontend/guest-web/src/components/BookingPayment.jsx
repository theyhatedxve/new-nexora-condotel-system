import { useEffect, useRef, useState } from 'react';
import { createBookingCheckout, getBookingPaymentState } from '../services/bookingPaymentsApi.js';
import { formatPesos } from '../utils/formatMoney.js';

function safeLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paymongo.com' &&
      !url.port && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

export default function BookingPayment() {
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const alive = useRef(false);
  const pending = useRef(false);
  const requestId = useRef(null);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    getBookingPaymentState(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRecord(result); })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setRecord(null);
          setError(failure.response?.status === 404
            ? 'Private access has expired. Request a new booking access link.'
            : 'We could not check payment availability. Contact the property if this continues.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [refresh]);
  async function create() {
    if (pending.current || busy || record?.state !== 'NONE') return;
    pending.current = true;
    setBusy(true);
    setError('');
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await createBookingCheckout(requestId.current);
      const current = result.state === 'PAID' ? await getBookingPaymentState() : result;
      if (alive.current) setRecord(current);
    } catch {
      if (alive.current) {
        setRecord({ state: 'UNKNOWN', checkoutUrl: null });
        setError('We could not confirm the payment link. Check the existing attempt before trying again.');
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-labelledby="booking-payment-heading">
      <h2 id="booking-payment-heading">Test payment</h2>
      <p>This checkout uses test mode. Returning from PayMongo does not confirm payment.</p>
      {busy && <p role="status">Checking payment options…</p>}
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {!busy && record?.state === 'NONE' && record.amountCentavos > 0 && (
        <>
          <p>Remaining balance: {formatPesos(record.amountCentavos)}</p>
          <button className="checkout-button" type="button" onClick={create}>Create PayMongo test payment link</button>
        </>
      )}
      {!busy && record?.state === 'NONE' && record.amountCentavos === 0 && <p>No remaining balance is available for checkout.</p>}
      {!busy && record?.state === 'PAID' && <p role="status">Full payment is recorded for this booking. Please contact reception for check-in.</p>}
      {!busy && record?.state === 'REVIEW_REQUIRED' && <p role="status">The payment needs property review. Contact the property before paying again.</p>}
      {!busy && record?.state === 'READY' && safeLink(record.checkoutUrl) && (
        <a className="checkout-link" href={record.checkoutUrl} rel="noreferrer noopener">Continue to PayMongo test checkout</a>
      )}
      {!busy && (record?.state === 'UNKNOWN' || record?.state === 'CREATING') && (
        <p role="status">The existing payment attempt is unresolved. Contact the property before starting another payment.</p>
      )}
      <p><button className="checkout-button" type="button" disabled={busy}
        onClick={() => { setBusy(true); setError(''); setRefresh((value) => value + 1); }}>Check existing payment attempt</button></p>
    </section>
  );
}
