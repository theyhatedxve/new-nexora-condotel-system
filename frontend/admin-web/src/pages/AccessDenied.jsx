import { Link } from "react-router";

import { useAuth } from "../auth/useAuth";
import { isStaff } from "../auth/staffNavigation";

export default function AccessDenied() {
  const { user, signOut } = useAuth();

  const Container = isStaff(user?.role)
    ? "section"
    : "main";

  return (
    <Container
      className="session-state"
      aria-labelledby="denied-title"
    >
      <h1 id="denied-title">
        Access unavailable
      </h1>

      <p>
        This account does not have permission to open this area.
      </p>

      <div className="actions">
        {isStaff(user?.role) && (
          <Link to="/">
            Return to dashboard
          </Link>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    </Container>
  );
}