import { useEffect, useId, useRef, useState } from "react";
import { Banknote, Pencil, X } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import RoomTypeManagement from "../RoomTypeManagement";
import RoomTypeRentalPricing from "../RoomTypeRentalPricing.jsx";

function RoomTypeDialog({
  title,
  description,
  pricing = false,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [warning, setWarning] = useState("");

  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const headingRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) {
      dialog.showModal();
    }

    document.body.style.overflow = "hidden";
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow = previousOverflow;

      if (trigger?.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function showDialog() {
    setWarning("");
    setVisited(true);
    setOpen(true);
  }

  function requestClose() {
    const saving = dialogRef.current?.querySelector(
      '[aria-busy="true"]',
    );

    if (saving) {
      setWarning(
        "An operation is still running. Wait for its result before closing.",
      );
      return;
    }

    setWarning("");
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape" || event.defaultPrevented) return;

    event.preventDefault();
    event.stopPropagation();
    requestClose();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={
          pricing
            ? "room-types-screen__secondary"
            : "room-types-screen__primary"
        }
        onClick={showDialog}
      >
        {pricing ? (
          <Banknote size={17} aria-hidden="true" />
        ) : (
          <Pencil size={17} aria-hidden="true" />
        )}
        {pricing ? "Rental pricing" : "Create or edit"}
      </button>

      <dialog
        ref={dialogRef}
        className={
          "create-room-dialog room-type-dialog" +
          (pricing ? " room-type-dialog--pricing" : "")
        }
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
        onKeyDown={handleKeyDown}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
      >
        <div className="create-room-dialog__frame">
          <header className="create-room-dialog__header">
            <div>
              <h2 id={titleId} ref={headingRef} tabIndex={-1}>
                {title}
              </h2>
              <p id={descriptionId}>{description}</p>
            </div>

            <button
              type="button"
              className="room-types-screen__secondary"
              aria-label={`Close ${title}`}
              onClick={requestClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {warning && (
            <p className="create-room-dialog__warning" role="alert">
              {warning}
            </p>
          )}

          <div className="create-room-dialog__body">
            {visited ? children : null}
          </div>

          <footer className="create-room-dialog__footer">
            <p>
              Closing keeps the current form while this Room Types
              page remains open. Existing reload and review rules apply.
            </p>

            <button
              type="button"
              className="room-types-screen__secondary"
              onClick={requestClose}
            >
              Close
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}

export default function RoomTypeDialogs({ records }) {
  const { status, user } = useAuth();

  if (
    status !== "authenticated" ||
    !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user?.role)
  ) {
    return null;
  }

  return (
    <div className="room-type-dialogs" key={user.id}>
      <RoomTypeDialog
        title="Create or edit a room type"
        description="Manage category details and capacity. Review changes before confirming."
      >
        <RoomTypeManagement records={records} />
      </RoomTypeDialog>

      <RoomTypeDialog
        pricing
        title="Rental pricing"
        description="Configure hourly, nightly, weekly, and monthly rates for an existing room type."
      >
        <RoomTypeRentalPricing records={records} />
      </RoomTypeDialog>
    </div>
  );
}