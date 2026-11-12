import { Link, Navigate } from "react-router";
import { useGuestAuth } from "../auth/useGuestAuth";
import GuestSessionState from "../components/GuestSessionState";
import useGuestRegistration from "../hooks/useGuestRegistration";
import { getGuestReturnPath } from "../utils/guestReturnPath";
import "../styles/guest-auth.css";

export default function Register() {
  const auth = useGuestAuth();
  const form = useGuestRegistration();
  if (auth.status === "authenticated" && auth.user.role === "GUEST") {
    return <Navigate to={getGuestReturnPath()} replace />;
  }
  const received = form.state.status === "received";
  const pending = form.state.status === "pending";

  return (
    <section className="guest-auth" aria-labelledby="guest-register-title">
      <header className="guest-auth__heading">
        <h1 id="guest-register-title">Create your account</h1>
        <p>Register to book your stay at NEXORA.</p>
      </header>
      <div className="guest-auth__card">
        <GuestSessionState />
        {auth.status === "anonymous" && (
          <>
            {!received && (
              <form onSubmit={form.submit}>
                <fieldset disabled={pending}>
                  <legend>Your details</legend>
                  <label htmlFor="guest-first-name">First name</label>
                  <input
                    id="guest-first-name" name="firstName" required maxLength={100}
                    autoComplete="given-name" value={form.fields.firstName} onChange={form.change}
                  />
                  <label htmlFor="guest-last-name">Last name</label>
                  <input
                    id="guest-last-name" name="lastName" required maxLength={100}
                    autoComplete="family-name" value={form.fields.lastName} onChange={form.change}
                  />
                  <label htmlFor="guest-register-email">Email</label>
                  <input
                    id="guest-register-email" name="email" type="email" required maxLength={254}
                    autoComplete="email" value={form.fields.email} onChange={form.change}
                  />
                  <label htmlFor="guest-register-password">Password</label>
                  <input
                    id="guest-register-password" name="password" type="password" required
                    minLength={12} maxLength={128} autoComplete="new-password"
                    aria-describedby="guest-register-password-help"
                    value={form.fields.password} onChange={form.change}
                  />
                  <label htmlFor="guest-register-confirmation">Confirm password</label>
                  <input
                    id="guest-register-confirmation" name="confirmation" type="password" required
                    minLength={12} maxLength={128} autoComplete="new-password"
                    value={form.fields.confirmation} onChange={form.change}
                  />
                  <small id="guest-register-password-help">Use 12–128 characters.</small>
                  <button type="submit">{pending ? "Submitting…" : "Create account"}</button>
                </fieldset>
              </form>
            )}
            {form.state.message && (
              <p className="guest-auth__feedback" role={form.state.status === "error" ? "alert" : "status"}>
                {form.state.message}
              </p>
            )}
            <p className="guest-auth__links">
              <Link to="/verify-email" state={{ email: form.fields.email }}>Email verification</Link>
            </p>
            <p className="guest-auth__links">Already registered? <Link to="/login">Sign in</Link></p>
          </>
        )}
      </div>
    </section>
  );
}
