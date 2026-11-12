import { Link } from "react-router";
import { useAuth } from "../auth/useAuth";
import useStaffPassword from "../hooks/useStaffPassword";
import "../styles/staff-users.css";

export default function StaffPassword({ mode }) {
  const auth = useAuth();
  const password = useStaffPassword(mode);
  const { state } = password;
  const invalidLink = password.invitation && !password.validToken;
  const finished = state.status === "success";
  const uncertain = state.status === "unknown";
  const waiting = state.status === "pending";

  return (
    <main className="auth-page staff-users">
      <section className="auth-card">
        <p className="eyebrow">NEXORA staff</p>
        <h1>
          {password.invitation ? "Set your password" : "Replace temporary password"}
        </h1>

        {auth.status === "authenticated" && (
          <>
            <p>
              You are signed in as {auth.user.email}.
              Sign out before setting up a staff password.
            </p>
            <button type="button" onClick={auth.signOut}>Sign out</button>
          </>
        )}

        {auth.status === "loading" && <p role="status">Checking your session…</p>}

        {["error", "logout-error"].includes(auth.status) && (
          <>
            <p role="alert">{auth.message}</p>
            <button type="button" onClick={auth.retry}>Retry session check</button>
          </>
        )}

        {auth.status === "anonymous" && (
          <>
            {invalidLink && (
              <p role="alert">
                Open the complete invitation link from your email.
                Reopen that link if this page was refreshed.
              </p>
            )}

            {!invalidLink && !finished && (
              <form onSubmit={password.submit}>
                <fieldset disabled={waiting || uncertain}>
                  <legend>Password details</legend>

                  {!password.invitation && (
                    <>
                      <label>
                        Email
                        <input
                          required
                          type="email"
                          maxLength={254}
                          autoComplete="username"
                          value={password.email}
                          onChange={(event) => password.setEmail(event.target.value)}
                        />
                      </label>

                      <label>
                        Temporary password
                        <input
                          required
                          type="password"
                          maxLength={128}
                          autoComplete="current-password"
                          value={password.temporaryPassword}
                          onChange={(event) =>
                            password.setTemporaryPassword(event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}

                  <label>
                    New password
                    <input
                      required
                      type="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      aria-describedby="staff-password-help"
                      value={password.newPassword}
                      onChange={(event) => password.setNewPassword(event.target.value)}
                    />
                  </label>

                  <label>
                    Confirm new password
                    <input
                      required
                      type="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={password.confirmation}
                      onChange={(event) => password.setConfirmation(event.target.value)}
                    />
                  </label>

                  <p id="staff-password-help">Use 12–128 characters.</p>
                  <button type="submit">{waiting ? "Saving…" : "Save password"}</button>
                </fieldset>
              </form>
            )}

            {state.message && (
              <p
                className="staff-users__notice"
                role={state.status === "error" ? "alert" : "status"}
              >
                {state.message}
              </p>
            )}

            {uncertain && (
              <button
                type="button"
                className="staff-users__secondary"
                onClick={password.allowReviewedRetry}
              >
                I checked sign-in and need to retry
              </button>
            )}
          </>
        )}

        <p><Link to="/login">Back to staff sign-in</Link></p>
      </section>
    </main>
  );
}
