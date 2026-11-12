import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  guestAuthError,
  resendGuestVerification,
  verifyGuestEmail,
} from "../services/guestAuthApi";
import "../styles/guest-auth.css";

function VerificationForm({ token, initialEmail }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState({ status: "idle", message: "" });
  const busy = useRef(false);
  const mounted = useRef(false);
  const validToken = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    mounted.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return () => { mounted.current = false; };
  }, []);

  async function run(action) {
    if (busy.current) return;
    busy.current = true;
    setState({ status: "pending", message: "Sending request…" });
    try {
      if (action === "verify") {
        await verifyGuestEmail(token);
      } else {
        await resendGuestVerification(email);
      }
      if (!mounted.current) return;
      setState({
        status: action === "verify" ? "verified" : "sent",
        message: action === "verify"
          ? "Your email is verified. You can now sign in."
          : "If the account is eligible, a verification email will be sent. Use the newest link.",
      });
    } catch (error) {
      if (!mounted.current) return;
      const status = error.response?.status;
      setState({
        status: "error",
        message: action === "verify" && [400, 401].includes(status)
          ? "This link is invalid, expired, or already used. Try signing in or request a new link."
          : guestAuthError(error) + " If verification may have completed, try signing in.",
      });
    } finally {
      busy.current = false;
    }
  }

  function resend(event) {
    event.preventDefault();
    void run("resend");
  }

  return (
    <div className="guest-auth__card">
      {validToken && state.status !== "verified" && (
        <button type="button" disabled={state.status === "pending"} onClick={() => void run("verify")}>
          Verify my email
        </button>
      )}
      {!validToken && <p>Open the verification link from your email, or request a new link.</p>}
      {state.message && (
        <p className="guest-auth__feedback" role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      {state.status !== "verified" && (
        <form onSubmit={resend}>
          <label htmlFor="guest-verification-email">Email</label>
          <input
            id="guest-verification-email" type="email" required maxLength={254} autoComplete="email"
            disabled={state.status === "pending"} value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={state.status === "pending"}>Request verification link</button>
        </form>
      )}
      <p className="guest-auth__links"><Link to="/login">Go to sign in</Link></p>
    </div>
  );
}

export default function VerifyEmail() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const initialEmail = typeof location.state?.email === "string" ? location.state.email : "";

  return (
    <section className="guest-auth" aria-labelledby="guest-verification-title">
      <header className="guest-auth__heading">
        <h1 id="guest-verification-title">Verify your email</h1>
        <p>Confirm your email address to activate your guest account.</p>
      </header>
      <VerificationForm key={token} token={token} initialEmail={initialEmail} />
    </section>
  );
}
