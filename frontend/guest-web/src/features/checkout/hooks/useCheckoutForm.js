import { useEffect, useRef, useState } from "react";
import { searchAvailability } from "../../rooms/services/availabilityApi.js";
import useGuestCheckout from "./useGuestCheckout.js";
import { getBookingApiScope } from "../utils/bookingContext.js";
import { readRental, rentalSelection } from "../../../shared/utils/rentalStay.js";

function selectedQuote(results, selection) {
  const quote = results.find((room) => room.id === selection.roomTypeId);
  if (!quote?.available || quote.totalAmountCentavos < 1) {
    throw new Error("This stay is unavailable. Adjust your stay search.");
  }
  return quote;
}

function priceKey(quote) {
  return JSON.stringify({
    total: quote.totalAmountCentavos,
    nightly: quote.rentalType ? null : quote.nightlyRateCentavos,
    rental: readRental(quote),
  });
}

export default function useCheckoutForm({ selection, profile }) {
  const flow = useGuestCheckout(getBookingApiScope());
  const [offer, setOffer] = useState(null);
  const [revision, setRevision] = useState(0);
  const [formError, setFormError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [details, setDetails] = useState({
    firstName: profile.firstName, lastName: profile.lastName,
    email: profile.email, phone: profile.phone ?? "",
  });
  const [arrivalTime, setArrivalTime] = useState(selection?.arrivalTime ?? "");
  const [paymentPreference, setPaymentPreference] = useState("");
  const [acknowledgmentAccepted, setAcknowledgmentAccepted] = useState(false);
  const submitRequest = useRef(null);
  const hasAttempt = Boolean(flow.attempt);

  useEffect(() => () => submitRequest.current?.abort(), []);

  useEffect(() => {
    if (!selection || hasAttempt) return;
    const controller = new AbortController();
    searchAvailability(selection, controller.signal).then((results) => {
      if (!controller.signal.aborted) {
        setOffer({ selection, revision, quote: selectedQuote(results, selection), error: "" });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setOffer({
        selection, revision, quote: null,
        error: "This stay could not be verified. Refresh availability or change your stay.",
      });
    });
    return () => controller.abort();
  }, [selection, hasAttempt, revision]);

  const current = offer && offer.selection === selection && offer.revision === revision;
  const quote = current ? offer.quote : null;
  const quoteError = current ? offer.error : "";
  const online = paymentPreference === "PAYMONGO";
  const locked = flow.busy || flow.storageBlocked || reviewing || !quote;
  const backToRooms = selection ? "/rooms?" + new URLSearchParams({
    checkIn: selection.checkIn, checkOut: selection.checkOut,
    guests: String(selection.guests), ...rentalSelection(selection),
  }).toString() : "/rooms";

  function updateDetail(event) {
    const { name, value } = event.target;
    setDetails((currentDetails) => ({ ...currentDetails, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selection || !quote || locked || flow.attempt || submitRequest.current) return;
    const arrival = Date.parse(selection.checkIn + "T" + arrivalTime + ":00+08:00");
    if (!details.firstName.trim() || !details.lastName.trim() ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime) ||
        !Number.isFinite(arrival) || arrival <= Date.now()) {
      setFormError("Check your guest details and choose a future arrival time.");
      return;
    }
    if (!["PAY_AT_PROPERTY", "PAYMONGO"].includes(paymentPreference) || !acknowledgmentAccepted) {
      setFormError("Choose a payment method and acknowledge its booking rules.");
      return;
    }
    const controller = new AbortController();
    submitRequest.current = controller;
    setReviewing(true);
    setFormError("");
    try {
      const latest = selectedQuote(await searchAvailability(selection, controller.signal), selection);
      if (controller.signal.aborted) return;
      if (priceKey(latest) !== priceKey(quote)) {
        setOffer({ selection, revision, quote: latest, error: "" });
        setAcknowledgmentAccepted(false);
        setFormError("The price changed. Review the updated total and acknowledge it before submitting again.");
        return;
      }
      await flow.submit({ selection, details, arrivalTime, paymentPreference });
    } catch {
      if (!controller.signal.aborted) {
        const error = "Your stay could not be verified. Refresh availability or change your stay.";
        setOffer({ selection, revision, quote: null, error });
        setFormError(error);
      }
    } finally {
      if (!controller.signal.aborted) setReviewing(false);
      submitRequest.current = null;
    }
  }

  function refreshQuote() {
    if (flow.busy || reviewing || flow.attempt || submitRequest.current) {
      return;
    }

    setAcknowledgmentAccepted(false);
    setRevision((value) => value + 1);
    setFormError("");
  }

  return {
    flow, quote, quoteError, formError, details, arrivalTime, paymentPreference,
    acknowledgmentAccepted, online, locked, reviewing, backToRooms,
    updateDetail, refreshQuote, handleSubmit,
    changeArrivalTime(event) { setArrivalTime(event.target.value); },
    changePaymentPreference(event) {
      setPaymentPreference(event.target.value);
      setAcknowledgmentAccepted(false);
    },
    changeAcknowledgment(event) { setAcknowledgmentAccepted(event.target.checked); },
  };
}
