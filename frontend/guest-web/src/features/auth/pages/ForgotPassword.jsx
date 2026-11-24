import { Link } from "react-router";
import useGuestCredentialAction from "../hooks/useGuestCredentialAction.js";
import { requestGuestPasswordReset } from "../services/guestCredentialsApi.js";
import GuestCredentialFeedback from "../components/GuestCredentialFeedback.jsx";
import "../styles/guest-auth.css";

export default function ForgotPassword() {
  const state = useGuestCredentialAction();
  function submit(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    void state.run(() => requestGuestPasswordReset({ email }));
  }
  return (
    <section className="guest-auth" aria-labelledby="guest-forgot-title">
      <header className="guest-auth__heading">
        <h1 id="guest-forgot-title">Forgot your password?</h1>
        <p>Request a password reset link for your guest account.</p>
      </header>
      <div className="guest-auth__card">
        <form onSubmit={submit}>
          <fieldset disabled={state.pending}>
            <legend>Send a recovery email</legend>
            <label htmlFor="recovery-email">Account email</label>
            <input id="recovery-email" name="email" type="email" required maxLength={254} autoComplete="email" />
            <button type="submit">Send reset link</button>
          </fieldset>
        </form>
        <GuestCredentialFeedback state={state} />
        <p>Links expire in 30 minutes. Wait one minute between requests and use the newest link.</p>
        <p className="guest-auth__links"><Link to="/login">Back to sign in</Link></p>
      </div>
    </section>
  );
}
