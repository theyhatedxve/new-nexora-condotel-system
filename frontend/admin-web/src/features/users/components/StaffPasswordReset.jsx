import { useEffect, useId, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../auth/useAuth.js";
import useStaffUserChange from "../hooks/useStaffUserChange.js";

function ResetReview({ record, pending, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  function requestClose() {
    if (!pending) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="staff-editor__reset-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
    >
      <p className="staff-editor__eyebrow">Account security</p>
      <h2 id={titleId}>Reset to default password?</h2>
      <p id={descriptionId}>
        Reset the password for <strong>{record.name}</strong>.
        Existing sessions and setup links will end.
      </p>
      <div className="staff-editor__reset-account">
        <strong>{record.name}</strong>
        <span>{record.email}</span>
      </div>
      <p>
        The user must replace the configured default temporary password before
        signing in. Their role and account status will remain unchanged.
      </p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!pending) void onConfirm();
      }}>
        <label className="staff-editor__confirmation">
          <input type="checkbox" required disabled={pending} />
          <span>I confirm that this account’s password should be reset.</span>
        </label>
        <footer className="staff-editor__dialog-actions">
          <button type="button" className="staff-users__secondary"
            onClick={requestClose} disabled={pending} autoFocus>
            Cancel
          </button>
          <button type="submit" disabled={pending}>
            {pending ? "Resetting..." : "Confirm reset"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function StaffPasswordReset({ record, reviewOpen }) {
  const { user } = useAuth();
  const change = useStaffUserChange();
  const [open, setOpen] = useState(false);

  const targetAllowed = ["ADMIN", "MANAGER", "RECEPTIONIST"].includes(record.role);
  const actorAllowed = user.role === "SUPER_ADMIN" || (
    user.role === "ADMIN" && ["MANAGER", "RECEPTIONIST"].includes(record.role)
  );
  const canReset = record.id !== user.id && record.status === "ACTIVE" &&
    targetAllowed && actorAllowed;

  if (!canReset) return null;

  const pending = change.state.status === "pending";

  async function confirmReset() {
    if (change.blocked) return;
    await change.run({
      kind: "reset-password", id: record.id, email: record.email,
      input: { updatedAt: record.updatedAt },
    });
    setOpen(false);
  }

  return (
    <section className="staff-editor__security" aria-labelledby="staff-security-title">
      <div>
        <h2 id="staff-security-title">
          <KeyRound size={19} aria-hidden="true" />
          Account security
        </h2>
        <p>Restore the default temporary password when the user cannot access their account.</p>
      </div>
      <button type="button" className="staff-users__secondary"
        disabled={change.blocked || reviewOpen} onClick={() => setOpen(true)}>
        <KeyRound size={17} aria-hidden="true" />
        Reset to default password
      </button>
      {open && (
        <ResetReview record={record} pending={pending} onConfirm={confirmReset}
          onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
