import { Navigate } from "react-router";
import { isStaff } from "../auth/staffNavigation";
import AccessDenied from "./AccessDenied";
import useStaffLogin from "../hooks/useStaffLogin.js";

export default function Login() {
  const {
    status,
    user,
    message,
    email,
    password,
    submit,
    retrySession,
    changeEmail,
    changePassword,
  } = useStaffLogin();

  if (status === "authenticated") {
    return isStaff(user?.role) ? <Navigate to="/" replace /> : <AccessDenied />;
  }

  if (status !== "anonymous") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>NEXORA staff access</h1>

          {status === "loading" ? (
            <p role="status">Checking your session…</p>
          ) : (
            <>
              <p role="alert">{message}</p>

              <button type="button" onClick={retrySession}>
                Try again
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">NEXORA · Staff workspace</p>

        <h1 id="login-title">Sign in</h1>

        <p>Use your authorized staff account to continue.</p>

        {message && (
          <p role="status" className="feedback">
            {message}
          </p>
        )}

        <form onSubmit={submit}>
          <label htmlFor="staff-email">Email address</label>

          <input
            id="staff-email"
            type="email"
            autoComplete="username"
            maxLength={254}
            required
            value={email}
            onChange={changeEmail}
          />

          <label htmlFor="staff-password">Password</label>

          <input
            id="staff-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={changePassword}
          />

          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
