import { Link } from "react-router";
import { isStaff } from "../auth/staffNavigation";
import useAccessDenied from "../hooks/useAccessDenied.js";

export default function AccessDenied() {
  const { user, Container, signOutStaff } = useAccessDenied();

  return (
    <Container className="session-state" aria-labelledby="denied-title">
      <h1 id="denied-title">Access unavailable</h1>

      <p>This account does not have permission to open this area.</p>

      <div className="actions">
        {isStaff(user?.role) && <Link to="/">Return to dashboard</Link>}

        <button type="button" onClick={signOutStaff}>
          Sign out
        </button>
      </div>
    </Container>
  );
}
