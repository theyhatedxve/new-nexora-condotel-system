import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import CreateRoomForm from "../CreateRoomForm";

export default function CreateRoomDialog({ rooms, returnSearch }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [closeWarning, setCloseWarning] = useState("");

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
    setCloseWarning("");
    setVisited(true);
    setOpen(true);
  }

  function requestClose() {
    const saving = dialogRef.current?.querySelector(
      '[aria-busy="true"]',
    );

    if (saving) {
      setCloseWarning(
        "A room operation is still running. Wait for its result before closing.",
      );
      return;
    }

    setCloseWarning("");
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
        className="rooms-screen__primary"
        onClick={showDialog}
      >
        <Plus size={18} aria-hidden="true" />
        Create room
      </button>

      <dialog
        ref={dialogRef}
        className="create-room-dialog"
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
                Create room
              </h2>

              <p id={descriptionId}>
                Add a physical room to an existing room type.
                Review the details before confirming.
              </p>
            </div>

            <button
              type="button"
              className="rooms-screen__secondary"
              aria-label="Close Create room"
              onClick={requestClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {closeWarning && (
            <p className="create-room-dialog__warning" role="alert">
              {closeWarning}
            </p>
          )}

          <div className="create-room-dialog__body">
            {visited && (
              <CreateRoomForm
                rooms={rooms}
                returnSearch={returnSearch}
              />
            )}
          </div>

          <footer className="create-room-dialog__footer">
            <p>
              Closing keeps your draft while this Rooms page remains open.
            </p>

            <button
              type="button"
              className="rooms-screen__secondary"
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