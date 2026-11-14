import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ROLE_LABELS } from "../auth/staffNavigation";
import useStaffUserChange from "../hooks/useStaffUserChange";
import { STATUS_LABELS } from "../services/staffUsersApi";

export default function StaffUserResult({ onReviewed }) {
  const change = useStaffUserChange();
  const { state } = change;
  const heading = useRef(null);

  useEffect(() => {
    if (["success", "rejected", "unknown", "review"].includes(state.status)) {
      heading.current?.focus();
    }
  }, [state.status]);

  if (state.status === "idle") return null;

  const waiting = ["pending", "checking"].includes(state.status);

  function continueEditing() {
    change.acknowledge();
    onReviewed();
  }

  return (
    <section className="staff-users__notice" aria-busy={waiting}>
      <h2 ref={heading} tabIndex={-1}>
        {state.status === "review" ? "Review current account" : "Account operation"}
      </h2>

      <p role="status">{state.message}</p>

      {state.status === "checking" && (
        <p role="status">Reloading current account information…</p>
      )}

      {state.status === "review" && (
        <>
          {state.accounts.map((account) => (
            <div className="staff-users__account-review" key={account.id}>
              <strong>{account.name || account.email}</strong>
              <span>{account.email}</span>
              <span>{ROLE_LABELS[account.role]}</span>
              <span>{STATUS_LABELS[account.status]}</span>
              <span>
                {account.mustChangePassword
                  ? "Password setup required"
                  : "Password setup completed"}
              </span>
              <Link to={"/users/" + encodeURIComponent(account.id)}>
                Open account
              </Link>
            </div>
          ))}

          {state.accounts.length === 0 && (
            <p>
              An exact email match was absent from the loaded results.
              Check the staff directory before creating another account.
            </p>
          )}

          {!state.complete && (
            <p>
              Additional search results exist. Review them in the directory
              before retrying account creation.
            </p>
          )}

          <button type="button" onClick={continueEditing}>
            I reviewed the current information
          </button>
        </>
      )}

      {!waiting && state.status !== "review" && (
        <button type="button" onClick={change.reconcile}>
          Reload current account
        </button>
      )}
    </section>
  );
}
