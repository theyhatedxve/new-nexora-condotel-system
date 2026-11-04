import { useEffect, useRef } from "react";
import { Link } from "react-router";

export default function RoomChangeReview({
  change,
  reviewMessage = (
    "Fresh records are loaded. Review the room list " +
    "or details and block history."
  ),
}) {
  const heading = useRef(null);
  const state = change.state;

  useEffect(() => {
    if (state.status !== "idle") {
      heading.current?.focus();
    }
  }, [state.status]);

  if (state.status === "idle") return null;

  const confirming = state.status === "confirm";
  const pending = state.status === "pending";

  return (
    <section
      className="action-review"
      aria-labelledby="room-change-title"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          confirming &&
          change.sameScope
        ) {
          event.preventDefault();
          change.back();
        }
      }}
    >
      <h2
        id="room-change-title"
        ref={heading}
        tabIndex={-1}
      >
        {state.title}
      </h2>

      <ul>
        {state.lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>

      {!change.sameScope ? (
        <p role="status">
          Finish this operation on its original page.{" "}
          <Link to={state.scope}>
            Return to that page
          </Link>
        </p>
      ) : confirming ? (
        <>
          {!change.confirmationCurrent && (
            <p role="alert">
              Records changed or are loading. Go back and
              review the form again.
            </p>
          )}

          <div className="actions">
            <button
              type="button"
              onClick={change.back}
            >
              Back
            </button>

            <button
              type="button"
              disabled={!change.confirmationCurrent}
              onClick={() => {
                void change.confirm();
              }}
            >
              Confirm change
            </button>
          </div>
        </>
      ) : pending ? (
        <p role="status">
          Submitting the change. Do not submit it again.
        </p>
      ) : (
        <>
          <p role="status">{state.message}</p>

          <p>
            Reload the records and compare them with the
            requested change above. Inputs remain available.
            A new submission will require another confirmation.
          </p>

          <button
            type="button"
            onClick={change.reloadForReview}
            disabled={
              state.status === "review" &&
              !change.ready
            }
          >
            Reload records for review
          </button>

          {state.status === "review" && (
            <>
              <p role="status">
                {change.freshReview
                    ? reviewMessage
                    : (
                        "Waiting for all records to load " +
                        "successfully. Use the retry controls " +
                        "if a read fails."
                    )}
              </p>

              <button
                type="button"
                disabled={!change.freshReview}
                onClick={change.acknowledge}
              >
                I reviewed the current records
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}