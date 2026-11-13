import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { signOutGuest } from "../services/guestAuthApi.js";
import usePrivateBooking from "./usePrivateBooking.js";

export default function useMyBookingView({
  reservationId = null,
  expectedReference = null,
}) {
  const navigate = useNavigate();

  const view = usePrivateBooking({ reservationId, expectedReference });

  const [error, setError] = useState("");

  const [signingOut, setSigningOut] = useState(false);

  const logoutPending = useRef(false);

  const booking = view.booking;

  async function signOut() {
    if (logoutPending.current) return;

    logoutPending.current = true;
    setSigningOut(true);
    setError("");

    try {
      await signOutGuest();

      navigate("/login", {
        replace: true,
      });
    } catch {
      setError("Sign out could not be confirmed. Please try again.");
    } finally {
      logoutPending.current = false;
      setSigningOut(false);
    }
  }

  const method =
    booking?.paymentPreference === "PAYMONGO"
      ? "PayMongo test checkout"
      : booking?.paymentPreference === "PAY_AT_PROPERTY"
        ? "Pay at Property"
        : "Not recorded";

  const propertyPending =
    booking?.status === "PENDING" && booking?.paymentPreference === "PAY_AT_PROPERTY";

  const closed = booking && ["EXPIRED", "CANCELLED"].includes(booking.status);

  return { view, error, signingOut, booking, signOut, method, propertyPending, closed };
}
