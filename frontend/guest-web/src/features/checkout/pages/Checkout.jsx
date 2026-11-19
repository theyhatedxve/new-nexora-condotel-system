import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

import { useGuestAuth } from "../../auth/useGuestAuth.js";
import { getGuestProfile } from "../../booking/services/accountBookingsApi.js";
import useCheckoutSelection from "../hooks/useCheckoutSelection.js";
import { CheckoutForm } from "../components/CheckoutForm.jsx";

import "../styles/checkout.css";
import "../styles/checkout-view.css";
import "../styles/guest-checkout.css";
import "../styles/checkout-luxury.css";

export default function Checkout() {
  const auth = useGuestAuth();
  const { roomTypeId, search, parsed } = useCheckoutSelection();

  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    profile: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    getGuestProfile(controller.signal).then(
      (profile) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", profile });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setState({ status: "error", profile: null });
        }
      },
    );

    return () => controller.abort();
  }, [auth.user.id, revision]);

  function retry() {
    setState({ status: "loading", profile: null });
    setRevision((value) => value + 1);
  }

  if (state.status !== "ready") {
    return (
      <main
        className="checkout-page checkout-view guest-checkout"
        aria-labelledby="checkout-profile-title"
      >
        <Link className="checkout-view__back" to="/rooms">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to rooms
        </Link>

        <section className="checkout-panel checkout-receipt">
          <p className="checkout-kicker">YOUR NEXORA STAY</p>

          <h1 id="checkout-profile-title">
            {state.status === "loading"
              ? "Preparing your booking"
              : "Guest details unavailable"}
          </h1>

          {state.status === "loading" ? (
            <p className="checkout-note" role="status">
              Loading your guest account details. Please wait.
            </p>
          ) : (
            <>
              <p className="checkout-error" role="alert">
                Your guest profile could not be loaded. Please try
                again before continuing.
              </p>

              <button
                className="checkout-view__refresh"
                type="button"
                onClick={retry}
              >
                Try again
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <CheckoutForm
      key={`${auth.user.id}:${roomTypeId}:${search}`}
      selection={parsed.selection}
      selectionError={parsed.error}
      profile={state.profile}
    />
  );
}