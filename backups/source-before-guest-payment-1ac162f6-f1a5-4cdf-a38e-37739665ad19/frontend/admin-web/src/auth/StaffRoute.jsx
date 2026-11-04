import { Navigate, Outlet } from "react-router";

import { useAuth } from "./useAuth";
import { isStaff } from "./staffNavigation";
import AccessDenied from "../pages/AccessDenied";

export default function StaffRoute({ roles }) {
  const {
    status,
    user,
    message,
    retry,
    signOut,
  } = useAuth();

  if (status === "loading") {
    return (
      <main
        className="session-state"
        aria-busy="true"
      >
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  if (
    status === "error" ||
    status === "logout-error"
  ) {
    return (
      <main className="session-state">
        <h1>
          {status === "logout-error"
            ? "Sign-out incomplete"
            : "Session unavailable"}
        </h1>

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
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (
    !isStaff(user?.role) ||
    (roles && !roles.includes(user.role))
  ) {
    return <AccessDenied />;
  }

  return <Outlet />;
}