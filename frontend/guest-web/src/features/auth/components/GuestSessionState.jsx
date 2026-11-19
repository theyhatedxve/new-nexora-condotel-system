import { Link } from "react-router";
import { useGuestAuth } from "../useGuestAuth.js";
import "../styles/guest-auth.css";

export default function GuestSessionState() {
  const auth = useGuestAuth();

  if (auth.status === "loading") {
    return (
      <p role="status">
        {auth.message || "Checking your session…"}
      </p>
    );
  }

  if (auth.status === "error" || auth.status === "logout-error") {
    return (
      <div className="guest-auth__feedback">
        <p role="alert">{auth.message}</p>

        <div className="guest-auth__actions">
          {auth.status === "error" && (
            <button
              type="button"
              onClick={() => void auth.retry()}
            >
              Retry session check
            </button>
          )}

          <button
            type="button"
            onClick={() => void auth.signOut()}
          >
            {auth.status === "logout-error"
              ? "Retry sign out"
              : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  if (
    auth.status === "authenticated" &&
    auth.user.role !== "GUEST"
  ) {
    return (
      <div className="guest-auth__feedback">
        <p>You are signed in with a staff account.</p>
        <p>Use a guest account to make a website booking.</p>

        <button
          type="button"
          onClick={() => void auth.signOut()}
        >
          Sign out
        </button>

        <p>
          <Link to="/rooms">Browse rooms</Link>
        </p>
      </div>
    );
  }

  return null;
}