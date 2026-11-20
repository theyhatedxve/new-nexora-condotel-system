import { useEffect, useId, useRef } from "react";
import { Brush, CheckCircle2, ChevronDown, X } from "lucide-react";

import { useAuth } from "../../auth/useAuth.js";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { housekeepingRoles } from "../services/housekeepingApi.js";
import useRoomHousekeeping from "../hooks/useRoomHousekeeping.js";
import {
  formatStatus,
  formatTimestamp,
} from "../../../shared/utils/formatters.js";

function HousekeepingDialog({ flow, roomNumber }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const completing = flow.review.to === "READY";

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

  return (
    <dialog
      ref={dialogRef}
      className="room-focus__dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={flow.busy}
      onCancel={(event) => {
        event.preventDefault();
        flow.closeReview();
      }}
    >
      <header className="room-focus__dialog-header">
        <div>
          <p className="room-focus__eyebrow">Room {roomNumber}</p>
          <h2 id={titleId}>
            {completing ? "Mark room ready" : "Start cleaning"}
          </h2>
        </div>

        <button
          type="button"
          className="room-focus__icon-button"
          aria-label="Close housekeeping review"
          disabled={flow.busy}
          onClick={flow.closeReview}
          autoFocus
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <p id={descriptionId}>
        Change status from{" "}
        <strong>{formatStatus(flow.review.from)}</strong> to{" "}
        <strong>{formatStatus(flow.review.to)}</strong>.
      </p>

      {flow.unknown ? (
        <p role="alert" className="room-focus__warning">
          The result is unconfirmed, or the room changed. Close this
          dialog and refresh the room before making another request.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void flow.confirm();
          }}
        >
          <label className="room-focus__check">
            <input
              type="checkbox"
              required
              disabled={flow.busy}
            />

            <span>
              {completing
                ? "Cleaning is complete and I have checked the room."
                : "I am recording the start of cleaning."}
            </span>
          </label>

          <footer className="room-focus__dialog-actions">
            <button
              type="button"
              className="room-ui__secondary"
              disabled={flow.busy}
              onClick={flow.closeReview}
            >
              Back
            </button>

            <button
              type="submit"
              className="room-focus__primary"
              disabled={flow.busy}
            >
              {flow.busy ? "Saving..." : "Confirm change"}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}

function Workspace({ user, room, onReload }) {
  const flow = useRoomHousekeeping({ user, room, onReload });
  const { history, page, setPage } = flow;

  const completing = flow.nextStatus === "READY";
  const total = history.status === "ready" ? history.data.total : null;

  return (
    <section
      className="room-focus__housekeeping"
      aria-label="Housekeeping"
    >
      <div className="room-focus__next-action">
        <div>
          <h2>Housekeeping</h2>
          <p>
            {flow.nextStatus
              ? completing
                ? "Mark ready after cleaning and inspection."
                : "Record when cleaning starts."
              : "No housekeeping transition is available in this status."}
          </p>
        </div>

        {flow.nextStatus && (
          <button
            type="button"
            className="room-focus__primary"
            disabled={flow.busy || flow.unknown}
            onClick={flow.openReview}
          >
            {completing ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <Brush size={18} aria-hidden="true" />
            )}

            {completing ? "Mark ready" : "Start cleaning"}
          </button>
        )}
      </div>

      {flow.unknown && (
        <p role="alert" className="room-focus__warning">
          Refresh the room to check the previous operation before trying again.
        </p>
      )}

      <details className="room-focus__accordion">
        <summary>
          <span>
            Housekeeping history
            {total !== null && (
              <small>{total} recorded changes</small>
            )}
          </span>

          <ChevronDown size={18} aria-hidden="true" />
        </summary>

        <div className="room-focus__content">
          <StaffDataState
            state={history}
            label="Room-status history"
          />

          {history.status === "ready" && (
            <>
              {history.data.items.length === 0 ? (
                <p>No recorded changes on this page.</p>
              ) : (
                <ol className="room-focus__history">
                  {history.data.items.map((item) => (
                    <li key={item.id}>
                      <strong>
                        {formatStatus(item.from)} → {formatStatus(item.to)}
                      </strong>

                      <span>
                        {item.staffName} · {formatTimestamp(item.changedAt)}
                      </span>

                      <small>{formatStatus(item.source)}</small>
                    </li>
                  ))}
                </ol>
              )}

              <p className="room-focus__muted">
                Earlier changes may not have recorded history.
              </p>

              {history.data.total > 20 && (
                <nav
                  className="room-focus__pagination"
                  aria-label="Room-status history pages"
                >
                  <button
                    type="button"
                    className="room-ui__secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>

                  <span>Page {page}</span>

                  <button
                    type="button"
                    className="room-ui__secondary"
                    disabled={
                      page >= 10000 ||
                      page * 20 >= history.data.total
                    }
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </details>

      {flow.review && (
        <HousekeepingDialog
          flow={flow}
          roomNumber={room.roomNumber}
        />
      )}
    </section>
  );
}

export default function HousekeepingPanel({ room, onReload }) {
  const { status, user } = useAuth();

  if (
    status !== "authenticated" ||
    !housekeepingRoles.includes(user?.role)
  ) {
    return null;
  }

  return (
    <Workspace
      key={`${user.id}:${room.id}:${room.status}`}
      user={user}
      room={room}
      onReload={onReload}
    />
  );
}