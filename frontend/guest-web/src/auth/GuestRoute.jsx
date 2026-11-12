import { Navigate, Outlet, useLocation } from "react-router";
import { useGuestAuth } from "./useGuestAuth";
import GuestSessionState from "../components/GuestSessionState";

export default function GuestRoute() {
  const auth = useGuestAuth();
  const location = useLocation();
  if (auth.status === "anonymous") {
    const returnTo = location.pathname + location.search;
    return (
      <Navigate to={"/login?returnTo=" + encodeURIComponent(returnTo)} replace />
    );
  }
  if (auth.status !== "authenticated" || auth.user.role !== "GUEST") {
    return <section className="guest-auth"><GuestSessionState /></section>;
  }
  return <Outlet />;
}
