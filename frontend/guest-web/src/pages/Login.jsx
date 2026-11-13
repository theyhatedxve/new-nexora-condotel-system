import { Link, Navigate } from "react-router";
import GuestSessionState from "../components/GuestSessionState";
import useGuestLogin from "../hooks/useGuestLogin";
import "../styles/guest-auth.css";

export default function Login() {
  const form = useGuestLogin();
  const { auth } = form;
  if (auth.status === "authenticated" && auth.user.role === "GUEST") {
    return <Navigate to={form.destination} replace />;
  }

  return (
    <section className="guest-auth" aria-labelledby="guest-login-title">
      <header className="guest-auth__heading">
        <p className="guest-auth__eyebrow">Welcome back</p>
        <h1 id="guest-login-title">Sign in to NEXORA</h1>
        <p>Access your account and booking services.</p>
      </header>
      <div className="guest-auth__card">
        <GuestSessionState />
        {auth.status === "anonymous" && (
          <>
            {auth.message && (
              <p className="guest-auth__feedback" role="status">{auth.message}</p>
            )}
            <form onSubmit={form.submit}>
              <label htmlFor="guest-login-email">Email</label>
              <input
                id="guest-login-email" type="email" required maxLength={254}
                autoComplete="username" placeholder="name@example.com"
                value={form.email} onChange={(event) => form.setEmail(event.target.value)}
              />
              <label htmlFor="guest-login-password">Password</label>
              <input
                id="guest-login-password" type="password" required maxLength={1024}
                autoComplete="current-password" value={form.password}
                onChange={(event) => form.setPassword(event.target.value)}
              />
              <button type="submit">Sign In</button>
            </form>
            <p className="guest-auth__links">
              New guest? <Link to="/register">Create an account</Link>
            </p>
            <p className="guest-auth__links">
              <Link to="/verify-email">Verify email or request a new link</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
