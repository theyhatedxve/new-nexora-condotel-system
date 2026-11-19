import { useEffect, useId, useRef } from "react";
import { BedDouble } from "lucide-react";

export default function AssignmentConfirmationDialog({
  reference,
  roomLabel,
  reassign,
  pending,
  confirmationCurrent,
  locked,
  headingRef,
  onConfirm,
  onBack,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;

    if (!dialog.open) {
      dialog.showModal();
    }

    headingRef.current?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      window.requestAnimationFrame(() => {
        if (opener instanceof HTMLElement && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, [headingRef]);

  function requestBack() {
    if (!pending) {
      onBack();
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    event.stopPropagation();
    requestBack();
  }

  return (
    <dialog
      ref={dialogRef}
      className="assignment-confirmation"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      aria-busy={pending}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestBack();
      }}
    >
      <header className="assignment-confirmation__header">
        <span className="assignment-confirmation__icon">
          <BedDouble size={24} aria-hidden="true" />
        </span>

        <div>
          <p className="assignment-confirmation__eyebrow">
            Review assignment
          </p>
          <h3 id={titleId} ref={headingRef} tabIndex={-1}>
            {reassign ? "Reassign room" : "Assign room"}
          </h3>
        </div>
      </header>

      <p id={descriptionId}>
        Review the selected room before confirming.
        Availability is checked again when you confirm.
      </p>

      <dl className="assignment-confirmation__facts">
        <div className="assignment-confirmation__room">
          <dt>Selected room</dt>
          <dd>{roomLabel}</dd>
        </div>
        <div>
          <dt>Booking reference</dt>
          <dd>{reference}</dd>
        </div>
      </dl>

      {!confirmationCurrent && (
        <p className="assignment-confirmation__warning" role="alert">
          Records changed. Go back and review the latest records
          before confirming.
        </p>
      )}

      {pending && (
        <p role="status">
          Saving assignment. Please wait before closing.
        </p>
      )}

      <footer className="assignment-confirmation__actions">
        <button
          type="button"
          className="secondary-button"
          disabled={pending}
          onClick={requestBack}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!confirmationCurrent || pending || locked}
          onClick={onConfirm}
        >
          {pending
            ? "Saving…"
            : reassign
              ? "Confirm reassignment"
              : "Confirm assignment"}
        </button>
      </footer>
    </dialog>
  );
}
