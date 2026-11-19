import { useId, useRef, useState } from "react";
import { cancelMyBooking } from "../services/guestReservationsApi.js";
import { displayTime } from "../utils/bookingDisplayTime.js";

export default function GuestCancellation({ booking, onRefresh }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const policy = booking.cancellationPolicy;

  async function submit(event) {
    event.preventDefault();
    if (pending.current || !policy?.unpaidEligible) return;
    const cleaned = reason.trim();
    if (cleaned.length < 3 || cleaned.length > 500) {
      setError("Enter a cancellation reason of 3–500 characters.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await cancelMyBooking(booking.id, cleaned);
      onRefresh();
    } catch {
      setError("Cancellation could not be confirmed. Refresh the booking before retrying; eligibility depends on the current deadline and payment status.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!policy) return null;
  return (
    <section className="my-booking__card" aria-labelledby={id}>
      <h2 id={id}>Cancellation</h2>
      <p className="my-booking__notice">{policy.text}</p>
      {policy.cancellationDeadlineAt && (
        <p>Cancellation closes: <strong>{displayTime(policy.cancellationDeadlineAt)}</strong> · Philippine time</p>
      )}
      {booking.status === "CANCELLED" ? (
        <p role="status">This booking is cancelled.</p>
      ) : policy.unpaidEligible ? (
        <form className="my-booking__cancellation" onSubmit={submit} aria-busy={busy}>
          <label htmlFor={id + "-reason"}>Cancellation reason</label>
          <textarea id={id + "-reason"} value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3} maxLength={500} required rows={3} disabled={busy} />
          <p>Submitting cancels this reservation and releases its room inventory.</p>
          <button className="my-booking__button" type="submit" disabled={busy}>
            {busy ? "Cancelling..." : "Cancel reservation"}
          </button>
        </form>
      ) : (
        <p>{policy.reason || "Contact the property for assistance."}</p>
      )}
      {error && <p className="my-booking__error" role="alert">{error}</p>}
    </section>
  );
}
