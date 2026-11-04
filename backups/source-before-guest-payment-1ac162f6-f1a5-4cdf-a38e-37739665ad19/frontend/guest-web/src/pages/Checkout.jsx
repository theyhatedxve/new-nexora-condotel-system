import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
  useSearchParams,
} from "react-router";

import {
  searchAvailability,
} from "../services/availabilityApi.js";

import {
  createPayAtPropertyReservation,
} from "../services/reservationsApi.js";

import {
  formatPesos,
} from "../utils/formatMoney.js";

import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import "../styles/checkout-view.css";

import "../styles/checkout.css";

function CheckoutForm({
  roomTypeId,
  checkIn,
  checkOut,
  guests,
}) {
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [details, setDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [phase, setPhase] = useState("idle");
  const [problem, setProblem] = useState("");
  const [receipt, setReceipt] = useState(null);

  const submitting = useRef(false);
  const receiptHeading = useRef(null);

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  const validSelection =
    datePattern.test(checkIn) &&
    datePattern.test(checkOut) &&
    Number.isSafeInteger(guests) &&
    guests >= 1 &&
    guests <= 2_147_483_647;

  const selectionError = validSelection
    ? quoteError
    : "Choose valid dates and guests from the Rooms page.";

  useEffect(() => {
    const controller = new AbortController();

    if (!validSelection) {
      return () => controller.abort();
    }

    searchAvailability(
      {
        checkIn,
        checkOut,
        guests,
      },
      controller.signal,
    )
      .then((results) => {
        if (controller.signal.aborted) {
          return;
        }

        const selected = results.find(
          (room) => room.id === roomTypeId,
        );

        if (!selected?.available) {
          setQuoteError(
            "This room type is unavailable for your selected stay.",
          );
          return;
        }

        setQuote(selected);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setQuoteError(
            "We could not check this stay. Check your dates or try again.",
          );
        }
      });

    return () => controller.abort();
  }, [
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    refresh,
    validSelection,
  ]);

  useEffect(() => {
    if (receipt) {
      receiptHeading.current?.focus();
    }
  }, [receipt]);

  function updateDetail(event) {
    const { name, value } = event.target;

    setDetails((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function refreshQuote() {
    setQuote(null);
    setQuoteError("");
    setRefresh((value) => value + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      submitting.current ||
      !quote ||
      phase === "uncertain" ||
      receipt
    ) {
      return;
    }

    if (
      !details.firstName.trim() ||
      !details.lastName.trim()
    ) {
      setProblem(
        "Please enter your first and last names.",
      );
      return;
    }

    // The ref blocks a second click immediately,
    // before React finishes updating the button.
    submitting.current = true;
    setPhase("submitting");
    setProblem("");

    try {
      const result =
        await createPayAtPropertyReservation({
          roomTypeId,
          checkIn,
          checkOut,
          guests,
          firstName: details.firstName.trim(),
          lastName: details.lastName.trim(),
          email: details.email.trim(),

          ...(details.phone.trim()
            ? {
                phone: details.phone.trim(),
              }
            : {}),
        });

      setReceipt(result);
      setPhase("success");
    } catch (error) {
      const status = error.response?.status;

      // These responses explicitly reject the booking.
      if (
        [400, 403, 404, 409, 429].includes(status)
      ) {
        submitting.current = false;
        setPhase("idle");

        if (status === 404 || status === 409) {
          setQuote(null);
          setQuoteError(
            "Availability changed. Refresh this stay or choose another room.",
          );
        }

        const messages = {
          400: "Check your guest details and stay dates.",
          403: "Booking is unavailable from this website address. Please contact the property.",
          404: "This room type is no longer available.",
          409: "The stay could not be reserved. Please refresh availability.",
          429: "Too many attempts. Please wait one minute before trying again.",
        };

        setProblem(messages[status]);
      } else {
        // A timeout or lost response does not prove
        // that the reservation failed to save.
        setPhase("uncertain");
        setProblem(
          "We could not confirm the booking result. Please contact the property before making another booking.",
        );
      }
    }
  }

    if (receipt) {
    return (
      <main className="checkout-page checkout-view">
        <section
          className="checkout-panel checkout-receipt"
          aria-labelledby="booking-receipt-title"
        >
          <div
            className="checkout-view__confirmation-icon"
            aria-hidden="true"
          >
            <Check size={30} />
          </div>

          <p className="checkout-kicker">
            PAY AT PROPERTY
          </p>

          <h1
            id="booking-receipt-title"
            ref={receiptHeading}
            tabIndex={-1}
          >
            Your reservation is confirmed
          </h1>

          <p className="checkout-view__receipt-intro">
            No payment has been collected.
            Full payment is required at the
            property before check-in.
          </p>

          <div className="checkout-view__reference">
            <span>Booking reference</span>
            <strong>
              {receipt.reservationNumber}
            </strong>
          </div>

          <dl className="checkout-summary">
            <div>
              <dt>Reservation</dt>
              <dd>Confirmed</dd>
            </div>

            <div>
              <dt>Payment</dt>
              <dd>No payment collected</dd>
            </div>

            <div>
              <dt>Check-in</dt>
              <dd>{checkIn}</dd>
            </div>

            <div>
              <dt>Check-out</dt>
              <dd>{checkOut}</dd>
            </div>

            <div>
              <dt>Guests</dt>
              <dd>{guests}</dd>
            </div>

            <div>
              <dt>Confirmed nightly rate</dt>
              <dd>
                {formatPesos(
                  receipt.nightlyRateCentavos,
                )}
              </dd>
            </div>

            <div className="checkout-total">
              <dt>Confirmed stay total</dt>
              <dd>
                {formatPesos(
                  receipt.totalAmountCentavos,
                )}
              </dd>
            </div>
          </dl>

          <p className="checkout-note">
            Save this reference. Contact the
            property for assistance with
            your booking.
          </p>

          <p className="checkout-note">
            Unpaid reservations can be cancelled
            without a cancellation fee before
            check-in. Contact the property to
            request cancellation.
          </p>

          <div className="checkout-view__receipt-actions">
            <Link
              className="checkout-view__primary-link"
              to="/booking-access"
            >
              Request private booking access
              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </Link>

            <Link
              className="checkout-view__secondary-link"
              to="/rooms"
            >
              Return to rooms
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const pending = phase === "submitting";

  const locked =
    pending ||
    phase === "uncertain";

    return (
    <main className="checkout-page checkout-view">
      <Link
        className="checkout-view__back"
        to={
          validSelection
            ? `/rooms?${new URLSearchParams({
                checkIn,
                checkOut,
                guests: String(guests),
              }).toString()}`
            : "/rooms"
        }
      >
        <ArrowLeft
          size={18}
          aria-hidden="true"
        />

        {validSelection
          ? "Back to selected rooms"
          : "Back to rooms"}
      </Link>

      <header className="checkout-view__heading">
        <p className="checkout-kicker">
          YOUR NEXORA STAY
        </p>

        <h1>Complete your booking</h1>

        <p>
          Reserve your stay without creating
          an account.
        </p>

        <span className="checkout-view__payment-label">
          Pay at Property
        </span>
      </header>

      <div className="checkout-grid">
        <section
          className="checkout-panel"
          aria-labelledby="guest-details-title"
        >
          <h2 id="guest-details-title">
            Primary guest details
          </h2>

          <p className="checkout-view__form-intro">
            Enter the details of the primary
            guest. Fields marked * are required.
          </p>

          <form
            onSubmit={handleSubmit}
            aria-busy={pending}
          >
            <fieldset
              className="checkout-fields"
              disabled={locked || !quote}
            >
              <legend className="checkout-legend">
                Contact information
              </legend>

              <div className="checkout-view__field-grid">
                <div className="checkout-view__field">
                  <label htmlFor="booking-first-name">
                    First name{" "}
                    <span aria-hidden="true">*</span>
                  </label>

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
                  <label htmlFor="booking-last-name">
                    Last name{" "}
                    <span aria-hidden="true">*</span>
                  </label>

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
                  <label htmlFor="booking-email">
                    Email{" "}
                    <span aria-hidden="true">*</span>
                  </label>

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

                <div className="checkout-view__field checkout-view__field--wide">
                  <label htmlFor="booking-phone">
                    Phone{" "}
                    <span className="checkout-view__optional">
                      (optional)
                    </span>
                  </label>

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
              </div>

              <label className="checkout-consent">
                <input
                  type="checkbox"
                  required
                />

                <span>
                  I understand that availability
                  and the final price are checked
                  when I confirm, and payment is
                  due at the property. Unpaid
                  reservations can be cancelled
                  without a cancellation fee
                  before check-in. Contact the
                  property to request cancellation.
                </span>
              </label>

              <button
                className="checkout-button"
                type="submit"
              >
                <span>
                  {pending
                    ? "Confirming your stay..."
                    : "Confirm - Pay at Property"}
                </span>

                {!pending && (
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                  />
                )}
              </button>
            </fieldset>

            {problem && (
              <p
                className="checkout-error checkout-view__alert"
                role="alert"
              >
                {problem}
              </p>
            )}

            {pending && (
              <p
                className="checkout-view__status"
                role="status"
              >
                Please wait for the booking
                result before submitting again.
              </p>
            )}
          </form>
        </section>

        <aside
          className="checkout-panel checkout-view__stay"
          aria-labelledby="stay-summary-title"
        >
          <p className="checkout-view__summary-kicker">
            STAY SUMMARY
          </p>

          <h2 id="stay-summary-title">
            Your stay
          </h2>

          {quote && (
            <h3 className="checkout-view__room-name">
              {quote.name}
            </h3>
          )}

          <dl className="checkout-summary">
            <div>
              <dt>Check-in</dt>
              <dd>
                {checkIn || "Not selected"}
              </dd>
            </div>

            <div>
              <dt>Check-out</dt>
              <dd>
                {checkOut || "Not selected"}
              </dd>
            </div>

            <div>
              <dt>Guests</dt>
              <dd>
                {Number.isSafeInteger(guests) &&
                guests >= 1
                  ? guests
                  : "Not selected"}
              </dd>
            </div>

            {quote && (
              <>
                <div>
                  <dt>Nights</dt>
                  <dd>{quote.nights}</dd>
                </div>

                <div>
                  <dt>Quoted nightly rate</dt>
                  <dd>
                    {formatPesos(
                      quote.nightlyRateCentavos,
                    )}
                  </dd>
                </div>

                <div className="checkout-total">
                  <dt>Quoted stay total</dt>
                  <dd>
                    {formatPesos(
                      quote.totalAmountCentavos,
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {!quote && !selectionError && (
            <p
              className="checkout-view__status"
              role="status"
            >
              Checking your stay...
            </p>
          )}

          {selectionError && (
            <div
              className="checkout-view__quote-error"
              role="alert"
            >
              <p className="checkout-error">
                {selectionError}
              </p>

              {!locked && validSelection && (
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

          <div className="checkout-view__payment-note">
            <strong>Payment due at the property</strong>

            <p>
              No online payment is collected
              on this page.
            </p>
          </div>

          <p className="checkout-note">
            This quote does not reserve a room.
            The backend confirms availability
            and the final price when you submit.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default function Checkout() {
  const { roomTypeId } = useParams();
  const [params] = useSearchParams();

  return (
    <CheckoutForm
      key={`${roomTypeId}:${params.toString()}`}
      roomTypeId={roomTypeId}
      checkIn={params.get("checkIn") || ""}
      checkOut={params.get("checkOut") || ""}
      guests={Number(params.get("guests"))}
    />
  );
}