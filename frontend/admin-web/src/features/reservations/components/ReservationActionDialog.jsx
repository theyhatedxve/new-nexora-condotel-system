import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

export default function ReservationActionDialog({
  id,
  title,
  reference,
  active,
  visited,
  returnFocus,
  onRequestClose,
  children,
}) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [closeWarning, setCloseWarning] = useState("");

  useEffect(() => {
    if (!active) return;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) dialog.showModal();

    document.body.style.overflow = "hidden";
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) dialog.close();

      document.body.style.overflow = previousOverflow;

      if (returnFocus?.isConnected) {
        returnFocus.focus({ preventScroll: true });
      }
    };
  }, [active, returnFocus]);

  function requestClose() {
    const pending = dialogRef.current?.querySelector(
      '[aria-busy="true"]',
    );

    if (pending) {
      setCloseWarning(
        "An operation is still running. Wait for its result before closing.",
      );
      return;
    }

    setCloseWarning("");
    onRequestClose();
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape" || event.defaultPrevented) return;

    event.preventDefault();
    event.stopPropagation();
    requestClose();
  }

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className="reservation-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onKeyDown={handleKeyDown}
      onCancel={(event) => event.preventDefault()}
    >
      <div className="reservation-dialog__frame">
        <header className="reservation-dialog__header">
          <div>
            <p className="reservation-dialog__eyebrow">
              Reservation workspace
            </p>

            <h2 id={titleId} ref={headingRef} tabIndex={-1}>
              {title}
            </h2>

            <p id={descriptionId} className="reservation-dialog__reference">
              {reference}
            </p>
          </div>

          <button
            type="button"
            className="reservation-dialog__close"
            aria-label={`Close ${title}`}
            onClick={requestClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        {closeWarning && (
          <p className="reservation-dialog__warning" role="alert">
            {closeWarning}
          </p>
        )}

        <div className="reservation-dialog__body">
          {visited ? children : null}
        </div>

        <footer className="reservation-dialog__footer">
          Closing keeps your draft while this reservation page remains open.
          Existing review and confirmation steps still apply.
        </footer>
      </div>
    </dialog>
  );
}