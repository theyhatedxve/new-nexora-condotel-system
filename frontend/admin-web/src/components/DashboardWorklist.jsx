import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown } from "lucide-react";

import {
  formatPesos,
  formatTimestamp,
  guestName,
} from "../utils/formatters";

const PURPOSES = {
  SHORT_NOTICE: "Short-notice contact",
  ONE_WEEK_REMINDER: "One-week reminder",
  ONE_DAY_REMINDER: "One-day reminder",
};

function DataNotice({ state, label }) {
  if (state.status === "ready") return null;

  const loading = state.status === "loading";

  return (
    <div className="calm-dashboard__data-notice">
      <p role={loading ? "status" : "alert"}>
        {loading
          ? `Loading ${label}…`
          : state.status === "denied"
            ? `Your account cannot view ${label}.`
            : `${label} could not be loaded.`}
      </p>

      {!loading && (
        <button
          type="button"
          className="calm-dashboard__button"
          onClick={state.reload}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function WorkRow({
  title,
  count,
  children,
  id,
  panelRef,
}) {
  return (
    <details
      id={id}
      ref={panelRef}
      className="calm-worklist__row"
      data-has-items={count > 0}
    >
      <summary>
        <span>{title}</span>
        <span className="calm-worklist__count">
          {count.toLocaleString("en-PH")}
        </span>
        <ChevronDown
          size={18}
          className="calm-worklist__chevron"
          aria-hidden="true"
        />
      </summary>

      <div className="calm-worklist__body">
        {children}
      </div>
    </details>
  );
}

function QueueRecords({ queue, explanation }) {
  return (
    <>
      <p className="calm-dashboard__muted">{explanation}</p>

      {queue.items.length === 0 ? (
        <p>No records currently need attention.</p>
      ) : (
        <ul className="calm-worklist__records">
          {queue.items.map((item) => (
            <li key={item.id}>
              <div>
                <Link
                  to={`/reservations/${encodeURIComponent(item.reservationId)}`}
                >
                  {item.label}
                </Link>
                <p>{item.reservationNumber}</p>
                <p>{formatTimestamp(item.createdAt)}</p>
              </div>

              <strong>{formatPesos(item.amountCentavos)}</strong>
            </li>
          ))}
        </ul>
      )}

      <p className="calm-dashboard__meta">
        Showing {queue.items.length} of {queue.total}, oldest first.
      </p>
    </>
  );
}

export default function DashboardWorklist({
  contacts,
  attention,
  cleaningRooms,
}) {
  const location = useLocation();
  const remindersRef = useRef(null);

  const contactData =
    contacts.status === "ready" ? contacts.data : null;

  const queues =
    attention.status === "ready" ? attention.data : null;

  useEffect(() => {
    if (
      location.hash !== "#guest-reminders" ||
      contacts.status !== "ready"
    ) {
      return;
    }

    const panel = remindersRef.current;
    if (!panel) return;

    panel.open = true;
    panel.querySelector("summary")?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start", behavior: "instant" });
  }, [location.hash, location.key, contacts.status]);

  return (
    <section
      className="dashboard-screen__panel"
      aria-labelledby="dashboard-attention-title"
    >
      <header className="calm-dashboard__section-heading">
        <div>
          <h2 id="dashboard-attention-title">Needs Attention</h2>
          <p className="calm-dashboard__muted">
            Open a row to review the work. Counts are separate queues.
          </p>
        </div>
      </header>

      <div className="calm-worklist">
        <DataNotice state={contacts} label="guest contact queues" />

        {contactData && (
          <>
            <WorkRow
              title="Booking requests"
              count={contactData.total}
            >
              <p className="calm-dashboard__muted">
                Pending Pay at Property requests, oldest first.
              </p>

              {contactData.items.length === 0 ? (
                <p>No pending requests need attention.</p>
              ) : (
                <ul className="calm-worklist__records">
                  {contactData.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <Link
                          to={`/reservations/${encodeURIComponent(item.id)}`}
                        >
                          {guestName(item.guest)}
                        </Link>

                        <p>{item.reservationNumber}</p>

                        <p>
                          {item.attention === "INITIAL_CONTACT_NEEDED"
                            ? "Initial contact needed"
                            : "Awaiting confirmation"}
                        </p>

                        <p>
                          Expected arrival:{" "}
                          {item.expectedArrivalAt
                            ? formatTimestamp(item.expectedArrivalAt)
                            : "Not recorded"}
                        </p>

                        <p>
                          Deadline:{" "}
                          {item.deadlineAt
                            ? formatTimestamp(item.deadlineAt)
                            : "Not recorded — staff review needed"}
                        </p>

                        {item.deadlineReached && (
                          <p className="calm-worklist__warning">
                            Deadline passed — check the current
                            reservation state.
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="calm-dashboard__meta">
                Showing {contactData.items.length} of{" "}
                {contactData.total} requests.
              </p>
            </WorkRow>

            <WorkRow
              id="guest-reminders"
              panelRef={remindersRef}
              title="Guest follow-ups"
              count={contactData.followUps.total}
            >
              <p className="calm-dashboard__muted">
                Due contacts for confirmed bookings. Record the
                matching contact purpose in reservation details.
                A Reached result clears that reminder.
              </p>

              {contactData.followUps.items.length === 0 ? (
                <p>No arrival contact reminders are currently due.</p>
              ) : (
                <ul className="calm-worklist__records">
                  {contactData.followUps.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <Link
                          to={`/reservations/${encodeURIComponent(item.id)}`}
                        >
                          {guestName(item.guest)}
                        </Link>
                        <p>{item.reservationNumber}</p>
                        <p>{PURPOSES[item.purpose]}</p>
                        <p>Due since: {formatTimestamp(item.dueAt)}</p>
                        <p>
                          Expected arrival:{" "}
                          {formatTimestamp(item.expectedArrivalAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="calm-dashboard__meta">
                Showing {contactData.followUps.items.length} of{" "}
                {contactData.followUps.total} reminders.
              </p>
            </WorkRow>
          </>
        )}

        <div
          className="calm-worklist__link-row"
          data-has-items={
            cleaningRooms.status === "ready" &&
            cleaningRooms.data.total > 0
          }
        >
          <span>Rooms awaiting cleaning</span>

          <span className="calm-worklist__count">
            {cleaningRooms.status === "ready"
              ? cleaningRooms.data.total.toLocaleString("en-PH")
              : cleaningRooms.status === "loading"
                ? "…"
                : "—"}
          </span>

          <Link to="/rooms?status=CLEANING&isActive=true">
            View rooms
          </Link>
        </div>

        {cleaningRooms.status !== "ready" && (
          <DataNotice state={cleaningRooms} label="cleaning room count" />
        )}

        <DataNotice state={attention} label="operational queues" />

        {queues?.chargeApprovals && (
          <WorkRow
            title="Charge approvals"
            count={queues.chargeApprovals.total}
          >
            <QueueRecords
              queue={queues.chargeApprovals}
              explanation="Proposed charges awaiting approval. These amounts are not recorded collections."
            />
          </WorkRow>
        )}

        {queues?.depositReturns && (
          <WorkRow
            title="Deposit returns"
            count={queues.depositReturns.total}
          >
            <QueueRecords
              queue={queues.depositReturns}
              explanation="Authorized returns awaiting cash handover. Approval does not establish that cash was returned."
            />
          </WorkRow>
        )}

        {queues?.extensionCorrections && (
          <WorkRow
            title="Extension corrections"
            count={queues.extensionCorrections.total}
          >
            <QueueRecords
              queue={queues.extensionCorrections}
              explanation="Unfulfilled extensions requiring cash-return or deposit-restoration review."
            />
          </WorkRow>
        )}
      </div>

      {queues?.canReviewReconciliation && (
        <p className="calm-dashboard__footer-link">
          <Link to="/payments/reconciliation">
            Open payment reconciliation
          </Link>
        </p>
      )}

      {contactData && (
        <p className="calm-dashboard__meta">
          Contact queues checked {formatTimestamp(contactData.asOf)}.
        </p>
      )}

      {queues && (
        <p className="calm-dashboard__meta">
          Operational queues checked {formatTimestamp(queues.asOf)}.
        </p>
      )}

      <p className="calm-dashboard__meta">
        Times use Philippine time. Opening these queues does not
        contact guests, approve charges, or record money movements.
      </p>
    </section>
  );
}