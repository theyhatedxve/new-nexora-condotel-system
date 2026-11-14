import { useEffect, useState } from "react";
import { searchAvailability } from "../services/availabilityApi.js";
import useGuestCheckout from "./useGuestCheckout.js";
import { getBookingApiScope } from "../utils/bookingContext.js";

export default function useCheckoutForm({ selection, profile }) {
  const flow = useGuestCheckout(getBookingApiScope());

  const [quote, setQuote] = useState(null);

  const [quoteError, setQuoteError] = useState("");

  const [revision, setRevision] = useState(0);

  const [formError, setFormError] = useState("");

  const [details, setDetails] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone ?? "",
  });

  const [arrivalTime, setArrivalTime] = useState("");

  const [paymentPreference, setPaymentPreference] = useState("");

  const [acknowledgmentAccepted, setAcknowledgmentAccepted] = useState(false);

  const hasAttempt = Boolean(flow.attempt);

  useEffect(() => {
    if (!selection || hasAttempt) {
      return;
    }

    const controller = new AbortController();

    searchAvailability(selection, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;

        const selected = results.find((room) => room.id === selection.roomTypeId);

        if (!selected?.available) {
          throw new Error("Selected stay is unavailable.");
        }

        if (
          typeof selected.name !== "string" ||
          !Number.isSafeInteger(selected.nights) ||
          selected.nights < 1 ||
          !Number.isSafeInteger(selected.nightlyRateCentavos) ||
          selected.nightlyRateCentavos < 1 ||
          !Number.isSafeInteger(selected.totalAmountCentavos) ||
          selected.totalAmountCentavos < 1
        ) {
          throw new Error("The quote is invalid.");
        }

        setQuote(selected);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setQuoteError(
            "This stay could not be verified. Refresh availability or choose another room.",
          );
        }
      });

    return () => controller.abort();
  }, [selection, hasAttempt, revision]);

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
    setRevision((value) => value + 1);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selection || !quote || flow.busy || flow.attempt || flow.storageBlocked) {
      return;
    }

    if (!details.firstName.trim() || !details.lastName.trim()) {
      setFormError("Enter your first and last names.");
      return;
    }

    const arrival = Date.parse(`${selection.checkIn}T${arrivalTime}:00+08:00`);

    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime) ||
      !Number.isFinite(arrival) ||
      arrival <= Date.now()
    ) {
      setFormError(
        "Choose a future expected arrival time on your check-in date, using Philippine time.",
      );
      return;
    }

    if (
      !["PAY_AT_PROPERTY", "PAYMONGO"].includes(paymentPreference) ||
      !acknowledgmentAccepted
    ) {
      setFormError("Choose a payment method and acknowledge its booking rules.");
      return;
    }

    setFormError("");

    void flow.submit({
      selection,
      details,
      arrivalTime,
      paymentPreference,
    });
  }

  if (flow.receipt || flow.attempt)
    return {
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
    };

  const online = paymentPreference === "PAYMONGO";

  const locked = flow.busy || flow.storageBlocked || !quote;

  const backToRooms = selection
    ? `/rooms?${new URLSearchParams({
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        guests: String(selection.guests),
      })}`
    : "/rooms";

  function changeArrivalTime(event) {
    setArrivalTime(event.target.value);
  }
  function changePaymentPreference(event) {
    setPaymentPreference(event.target.value);
    setAcknowledgmentAccepted(false);
  }
  function changeAcknowledgment(event) {
    setAcknowledgmentAccepted(event.target.checked);
  }

  return {
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
  };
}
