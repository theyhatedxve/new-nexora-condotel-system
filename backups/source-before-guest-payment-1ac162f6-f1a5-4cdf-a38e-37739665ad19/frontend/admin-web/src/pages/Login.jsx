import { useState } from "react";
import { Navigate } from "react-router";

import { useAuth } from "../auth/useAuth";
import { isStaff } from "../auth/staffNavigation";
import AccessDenied from "./AccessDenied";

export default function Login() {
  const {
    status,
    user,
    message,
    signIn,
    signOut,
    retry,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (status === "authenticated") {
    return isStaff(user?.role)
      ? <Navigate to="/" replace />
      : <AccessDenied />;
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

              <button
                type="button"
                onClick={() =>
                  void (
                    status === "logout-error"
                      ? signOut()
                      : retry()
                  )
                }
              >
                Try again
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  async function submit(event) {
    event.preventDefault();

    const submittedPassword = password;

    setPassword("");

    await signIn(email.trim(), submittedPassword);
  }

  return (
    <main className="auth-page">
      <section
        className="auth-card"
        aria-labelledby="login-title"
      >
        <p className="eyebrow">
          NEXORA · Staff workspace
        </p>

        <h1 id="login-title">Sign in</h1>

        <p>
          Use your authorized staff account to continue.
        </p>

        {message && (
          <p role="status" className="feedback">
            {message}
          </p>
        )}

        <form onSubmit={submit}>
          <label htmlFor="staff-email">
            Email address
          </label>

          <input
            id="staff-email"
            type="email"
            autoComplete="username"
            maxLength={254}
            required
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
          />

          <label htmlFor="staff-password">
            Password
          </label>

          <input
            id="staff-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}