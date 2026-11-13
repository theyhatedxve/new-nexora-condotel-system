import { Link } from "react-router";
import { useGuestAuth } from "../auth/useGuestAuth";
import GuestSessionState from "../components/GuestSessionState";
import "../styles/guest-auth.css";

export default function Logout() {
  const auth = useGuestAuth();

  return (
    <section className="guest-auth" aria-labelledby="guest-logout-title">
      <header className="guest-auth__heading">
        <h1 id="guest-logout-title">Sign out</h1>
      </header>
      <div className="guest-auth__card">
        <GuestSessionState />
        {auth.status === "authenticated" && auth.user.role === "GUEST" && (
          <>
            <p>You are signed in as {auth.user.email}.</p>
            <button type="button" onClick={() => void auth.signOut()}>
              Sign out
            </button>
          </>
        )}
        {auth.status === "anonymous" && (
          <p role="status">{auth.message || "You are signed out."}</p>
        )}
        <p className="guest-auth__links"><Link to="/login">Go to sign in</Link></p>
      </div>
    </section>
  );
}
