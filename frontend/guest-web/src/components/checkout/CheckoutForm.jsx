import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { formatPesos } from "../../utils/formatMoney.js";
import GuestBookingReceipt from "../GuestBookingReceipt.jsx";
import useCheckoutForm from "../../hooks/useCheckoutForm.js";

export function CheckoutForm({ selection, selectionError }) {
  const {
    flow,
    quote,
    quoteError,
    formError,
    details,
    arrivalTime,
    changeArrivalTime,
    paymentPreference,
    changePaymentPreference,
    acknowledgmentAccepted,
    changeAcknowledgment,
    updateDetail,
    refreshQuote,
    handleSubmit,
    online,
    locked,
    backToRooms,
  } = useCheckoutForm({ selection });

  if (flow.receipt) {
    return <GuestBookingReceipt flow={flow} />;
  }

  if (flow.attempt) {
    return (
      <main className="checkout-page checkout-view guest-checkout">
        <section className="checkout-panel checkout-receipt" aria-busy={flow.busy}>
          <p className="checkout-kicker">ORIGINAL BOOKING REQUEST</p>

          <h1>{flow.busy ? "Checking your booking" : "Recover your booking"}</h1>

          <p className="checkout-view__receipt-intro">
            This tab holds an earlier request. Recover it before creating another booking.
            Reloading this page does not submit it again.
          </p>

          {flow.attempt.reservationNumber && (
            <div className="checkout-view__reference">
              <span>Saved booking reference</span>
              <strong>{flow.attempt.reservationNumber}</strong>
            </div>
          )}

          <dl className="checkout-summary">
            <div>
              <dt>Check-in</dt>
              <dd>{flow.attempt.selection.checkIn}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{flow.attempt.selection.checkOut}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{flow.attempt.selection.guests}</dd>
            </div>
          </dl>

          {flow.error && (
            <p role="alert" className="checkout-error">
              {flow.error}
            </p>
          )}

          <div className="checkout-view__receipt-actions">
            <button
              className="checkout-button"
              type="button"
              disabled={flow.busy}
              onClick={flow.resume}
            >
              {flow.busy ? "Please wait..." : "Recover original request"}
            </button>

            <Link className="checkout-view__secondary-link" to="/booking-access">
              Request private email access
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page checkout-view guest-checkout">
      <Link className="checkout-view__back" to={backToRooms}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to rooms
      </Link>

      <header className="checkout-view__heading">
        <p className="checkout-kicker">YOUR NEXORA STAY</p>

        <h1>Complete your booking</h1>

        <p>
          Choose how to pay and tell us when you expect to arrive. An account is optional.
        </p>
      </header>

      <div className="checkout-grid">
        <section className="checkout-panel" aria-labelledby="guest-details-title">
          <h2 id="guest-details-title">Guest and payment details</h2>

          <p className="checkout-view__form-intro">Fields marked * are required.</p>

          <form onSubmit={handleSubmit} aria-busy={flow.busy}>
            <fieldset className="checkout-fields" disabled={locked}>
              <legend className="checkout-legend">Primary guest</legend>

              <div className="checkout-view__field-grid">
                <div className="checkout-view__field">
                  <label htmlFor="booking-first-name">First name *</label>
                  <input
                    id="booking-first-name"
                    name="firstName"
                    autoComplete="given-name"
                    maxLength={100}
                    required
                    value={details.firstName}
                    onChange={updateDetail}
                  />
                </div>

                <div className="checkout-view__field">
                  <label htmlFor="booking-last-name">Last name *</label>
                  <input
                    id="booking-last-name"
                    name="lastName"
                    autoComplete="family-name"
                    maxLength={100}
                    required
                    value={details.lastName}
                    onChange={updateDetail}
                  />
                </div>

                <div className="checkout-view__field checkout-view__field--wide">
                  <label htmlFor="booking-email">Email *</label>
                  <input
                    id="booking-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={details.email}
                    onChange={updateDetail}
                  />
                </div>

                <div className="checkout-view__field">
                  <label htmlFor="booking-phone">Phone (optional)</label>
                  <input
                    id="booking-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={details.phone}
                    onChange={updateDetail}
                  />
                </div>

                <div className="checkout-view__field">
                  <label htmlFor="booking-arrival">Expected arrival time *</label>
                  <input
                    id="booking-arrival"
                    type="time"
                    step={60}
                    required
                    aria-describedby="arrival-help"
                    value={arrivalTime}
                    onChange={changeArrivalTime}
                  />
                  <small id="arrival-help">
                    On {selection?.checkIn || "your check-in date"}, Philippine time.
                  </small>
                </div>
              </div>

              <fieldset className="guest-checkout__methods">
                <legend>Payment method *</legend>

                {[
                  {
                    value: "PAY_AT_PROPERTY",
                    title: "Pay at Property",
                    description:
                      "Request your stay now. Staff must contact you and confirm your agreement before the reservation is confirmed.",
                  },
                  {
                    value: "PAYMONGO",
                    title: "Pay online · test mode",
                    description:
                      "Continue to PayMongo after reserving. A verified full payment within the 15-minute hold confirms an eligible reservation.",
                  },
                ].map((method) => (
                  <label
                    key={method.value}
                    className={
                      "guest-checkout__choice" +
                      (paymentPreference === method.value ? " is-selected" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="paymentPreference"
                      value={method.value}
                      required
                      checked={paymentPreference === method.value}
                      onChange={changePaymentPreference}
                    />

                    <span>
                      <strong>{method.title}</strong>
                      <span>{method.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="guest-checkout__notice">
                {paymentPreference === "PAY_AT_PROPERTY"
                  ? "Your request stays pending until staff confirms it. Reply within 24 hours of the first call or email. The earlier deadline applies: that response deadline or 30 minutes after your expected arrival."
                  : online
                    ? "Test payments only. The hold starts when the booking is saved. A redirect or payment screenshot does not confirm payment. Late or conflicting payments require property review."
                    : "Choose a payment method to review its confirmation rules."}
              </div>

              <label className="checkout-consent">
                <input
                  type="checkbox"
                  required
                  checked={acknowledgmentAccepted}
                  onChange={changeAcknowledgment}
                />
                <span>
                  I have checked my stay and arrival details, and understand the selected
                  payment and confirmation rules. Availability and prices are checked
                  again by the backend.
                </span>
              </label>

              <button className="checkout-button" type="submit">
                {online ? "Reserve and prepare test payment" : "Send booking request"}
              </button>
            </fieldset>

            {(formError || flow.error) && (
              <p className="checkout-error" role="alert">
                {formError || flow.error}
              </p>
            )}
          </form>
        </section>

        <aside
          className="checkout-panel checkout-view__stay"
          aria-labelledby="stay-summary-title"
        >
          <p className="checkout-view__summary-kicker">STAY SUMMARY</p>

          <h2 id="stay-summary-title">{quote?.name || "Your selected stay"}</h2>

          <dl className="checkout-summary">
            <div>
              <dt>Check-in</dt>
              <dd>{selection?.checkIn || "Not selected"}</dd>
            </div>

            <div>
              <dt>Check-out</dt>
              <dd>{selection?.checkOut || "Not selected"}</dd>
            </div>

            <div>
              <dt>Guests</dt>
              <dd>{selection?.guests || "Not selected"}</dd>
            </div>

            {quote && (
              <>
                <div>
                  <dt>Nights</dt>
                  <dd>{quote.nights}</dd>
                </div>

                <div>
                  <dt>Quoted nightly rate</dt>
                  <dd>{formatPesos(quote.nightlyRateCentavos)}</dd>
                </div>

                <div className="checkout-total">
                  <dt>Quoted stay total</dt>
                  <dd>{formatPesos(quote.totalAmountCentavos)}</dd>
                </div>
              </>
            )}
          </dl>

          {(selectionError || quoteError) && (
            <div role="alert">
              <p className="checkout-error">{selectionError || quoteError}</p>

              {selection && !flow.busy && (
                <button
                  className="checkout-view__refresh"
                  type="button"
                  onClick={refreshQuote}
                >
                  Refresh availability
                </button>
              )}
            </div>
          )}

          {selection && !quote && !quoteError && (
            <p role="status">Checking your stay...</p>
          )}

          <p className="checkout-note">
            This quote does not reserve a room. Arrival time does not change the booked
            number of nights or calculate a new price.
          </p>

          <p className="checkout-note">
            Recovery is kept in this tab’s session storage. Guest contact details are not
            stored there. Keep this tab open if a booking result is uncertain.
          </p>
        </aside>
      </div>
    </main>
  );
}
