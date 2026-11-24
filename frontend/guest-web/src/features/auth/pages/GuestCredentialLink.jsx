import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import useGuestCredentialAction from "../hooks/useGuestCredentialAction.js";
import { confirmGuestEmail, resetGuestPassword } from "../services/guestCredentialsApi.js";
import GuestCredentialFeedback from "../components/GuestCredentialFeedback.jsx";
import GuestNewPasswordFields from "../components/GuestNewPasswordFields.jsx";
import "../styles/guest-auth.css";

function CredentialForm({ reset, location }) {
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ||
    new URLSearchParams(location.search).get("token") || "");
  const state = useGuestCredentialAction();
  const validToken = /^[a-f0-9]{64}$/.test(token);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.hash = "";
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);

  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    void state.run(async () => {
      const message = reset ? await resetGuestPassword({ ...fields, token }) : await confirmGuestEmail({ token });
      form.reset();
      return message;
    });
  }
  return (
    <div className="guest-auth__card">
      {!validToken && <p role="alert">This link is invalid or missing. Request a new link.</p>}
      {validToken && state.status !== "success" && (
        <form onSubmit={submit}>
          <fieldset disabled={state.pending}>
            <legend>{reset ? "Choose a new password" : "Confirm your requested email change"}</legend>
            {reset ? <GuestNewPasswordFields prefix="reset" /> :
              <p>Only confirm if you requested this change. This link makes this email address your new sign-in email.</p>}
            <button type="submit">{reset ? "Reset password" : "Confirm new sign-in email"}</button>
          </fieldset>
        </form>
      )}
      <GuestCredentialFeedback state={state} />
      <p className="guest-auth__links"><Link to="/login">Go to sign in</Link></p>
      {reset ? <p className="guest-auth__links"><Link to="/forgot-password">Request a new reset link</Link></p> :
        <p className="guest-auth__links"><Link to="/account/security">Request a new email change</Link></p>}
    </div>
  );
}

export default function GuestCredentialLink({ reset = false }) {
  const location = useLocation();
  return (
    <section className="guest-auth" aria-labelledby="guest-credential-title">
      <header className="guest-auth__heading">
        <h1 id="guest-credential-title">{reset ? "Reset your password" : "Confirm your new email"}</h1>
        <p>Completing this change signs out existing sessions. Links expire in 30 minutes.</p>
      </header>
      <CredentialForm key={location.key} reset={reset} location={location} />
    </section>
  );
}
