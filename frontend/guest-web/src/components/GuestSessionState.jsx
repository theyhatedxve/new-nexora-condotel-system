import { Link } from "react-router";
import { useGuestAuth } from "../auth/useGuestAuth";

export default function GuestSessionState() {
  const auth = useGuestAuth();
  if (auth.status === "loading") {
    return <p role="status">Checking your session…</p>;
  }
  if (["error", "logout-error"].includes(auth.status)) {
    return (
      <div className="guest-auth__feedback">
        <p role="alert">{auth.message}</p>
        <button type="button" onClick={() => void auth.retry()}>Retry session check</button>
      </div>
    );
  }
  if (auth.status === "authenticated" && auth.user.role !== "GUEST") {
    return (
      <div className="guest-auth__feedback">
        <p>You are signed in with a staff account.</p>
        <p>Use a guest account to make a website booking.</p>
        <button type="button" onClick={() => void auth.signOut()}>Sign out</button>
        <p><Link to="/rooms">Browse rooms</Link></p>
      </div>
    );
  }
  return null;
}
