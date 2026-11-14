import { useEffect, useState } from "react";
import { useGuestAuth } from "../auth/useGuestAuth";
import { getGuestProfile } from "../services/accountBookingsApi";
import useCheckoutSelection from "../hooks/useCheckoutSelection";
import { CheckoutForm } from "../components/checkout/CheckoutForm";
import "../styles/checkout.css";
import "../styles/checkout-view.css";
import "../styles/guest-checkout.css";

export default function Checkout() {
  const auth = useGuestAuth();
  const { roomTypeId, search, parsed } = useCheckoutSelection();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", profile: null });

  useEffect(() => {
    const controller = new AbortController();
    getGuestProfile(controller.signal).then(
      (profile) => {
        if (!controller.signal.aborted) setState({ status: "ready", profile });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "error", profile: null });
      },
    );
    return () => controller.abort();
  }, [auth.user.id, revision]);

  function retry() {
    setState({ status: "loading", profile: null });
    setRevision((value) => value + 1);
  }

  if (state.status === "loading") {
    return <p role="status">Loading your guest profile…</p>;
  }
  if (state.status === "error") {
    return (
      <section className="checkout-panel">
        <p role="alert">Your guest profile could not be loaded.</p>
        <button type="button" onClick={retry}>Try again</button>
      </section>
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
