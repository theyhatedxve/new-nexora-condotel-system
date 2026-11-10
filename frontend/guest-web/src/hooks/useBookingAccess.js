import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  exchangeBookingAccess,
  requestBookingAccess,
} from "../services/bookingAccessApi.js";

export default function useBookingAccess() {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => {
    return new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
  });

  const [notice, setNotice] = useState("");

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const submitting = useRef(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  async function openBooking() {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      if (!/^[a-f0-9]{64}$/.test(token)) {
        throw new Error("Invalid link");
      }

      await exchangeBookingAccess(token);
      setToken("");

      navigate("/my-booking", {
        replace: true,
      });
    } catch {
      setToken("");
      setError("This link could not be used. Request a new link and try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function requestLink(event) {
    event.preventDefault();

    if (submitting.current) return;

    const form = new FormData(event.currentTarget);

    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await requestBookingAccess({
        reservationNumber: String(form.get("reservationNumber")).trim(),
        email: String(form.get("email")).trim(),
      });

      setNotice(result.message);
    } catch (failure) {
      setError(
        failure.response?.status === 429
          ? "Too many requests. Please wait before requesting another link."
          : "We could not process the request. Check your details and try again later.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return { token, notice, error, busy, openBooking, requestLink };
}
