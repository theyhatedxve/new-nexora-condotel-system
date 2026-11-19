import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export default function ReportDialog({
  title,
  description,
  query,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);

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
    setVisited(true);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
  }

  return (
    <article className="reports-compact__report-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="reports-compact__range">
        {query.from} through {query.to}
      </p>

      <button
        ref={triggerRef}
        type="button"
        className="reports-page__secondary"
        onClick={showDialog}
      >
        View report
        <ArrowRight size={16} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        className="report-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;

          event.preventDefault();
          event.stopPropagation();
          closeDialog();
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
      >
        <div className="report-dialog__frame">
          <header className="report-dialog__header">
            <div>
              <h2 id={titleId} ref={headingRef} tabIndex={-1}>
                {title}
              </h2>

              <p id={descriptionId}>
                {query.from} through {query.to}, inclusive.
                Philippine time.
              </p>
            </div>

            <button
              type="button"
              className="reports-page__secondary"
              aria-label={`Close ${title}`}
              onClick={closeDialog}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="report-dialog__body">
            {visited ? children : null}
          </div>

          <footer className="report-dialog__footer">
            <button
              type="button"
              className="reports-page__secondary"
              onClick={closeDialog}
            >
              Close
            </button>
          </footer>
        </div>
      </dialog>
    </article>
  );
}