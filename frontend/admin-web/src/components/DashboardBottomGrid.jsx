import { Link } from "react-router";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Coins,
} from "lucide-react";

import {
  DashboardGuestReminders,
  DashboardOperationalQueues,
} from "./DashboardQueues.jsx";

import {
  formatPesos,
  formatStatus,
  formatStayDate,
  formatTimestamp,
  guestName,
} from "../utils/formatters";

function ReservationPreview({ item }) {
  return (
    <li className="dashboard-bottom__reservation">
      <div>
        <Link
          to={`/reservations/${encodeURIComponent(item.id)}`}
          aria-label={`View reservation ${item.reservationNumber} for ${guestName(item.guest)}`}
        >
          {guestName(item.guest)}
        </Link>

        <p>{item.roomType.name}</p>

        <p className="dashboard-bottom__dates">
          {formatStayDate(item.checkInDate)}
          {" → "}
          {formatStayDate(item.checkOutDate)}
        </p>
      </div>

      <span
        className="dashboard-screen__badge"
        data-status={item.status}
      >
        {formatStatus(item.status)}
      </span>
    </li>
  );
}

function CardHeading({ Icon, title, id, children }) {
  return (
    <header className="dashboard-bottom__heading">
      <h2 id={id}>
        <Icon size={22} aria-hidden="true" />
        {title}
      </h2>
      {children}
    </header>
  );
}

function ExpandLabel({ children }) {
  return (
    <>
      <span>{children}</span>
      <ChevronDown size={17} aria-hidden="true" />
    </>
  );
}

export default function DashboardBottomGrid({
  recent,
  recentItems,
  financial,
  finance,
  collections,
  contacts,
  attention,
  remindersRef,
  contactMode,
  onContactModeChange,
}) {
  const financialReady =
    financial.status === "ready" &&
    finance?.status === "READY";

  const financialReview =
    financial.status === "ready" &&
    finance?.status === "REVIEW_REQUIRED";

  const contactData =
    contacts.status === "ready" ? contacts.data : null;

  const queueData =
    attention.status === "ready" ? attention.data : null;

  const queueDefinitions = [
    {
      key: "chargeApprovals",
      label: "Charge approvals",
    },
    {
      key: "depositReturns",
      label: "Deposit returns",
    },
    {
      key: "extensionCorrections",
      label: "Extension corrections",
    },
  ];

  const firstRequest = contactData?.items[0];
  const firstReminder = contactData?.followUps.items[0];

  const hasPassedDeadline = Boolean(
    contactData?.items.some((item) => item.deadlineReached),
  );

  return (
    <div className="dashboard-bottom">
      <section
        className="dashboard-bottom__card"
        aria-labelledby="dashboard-recent-title"
      >
        <CardHeading
          Icon={CalendarDays}
          title="Recent Reservations"
          id="dashboard-recent-title"
        >
          <Link
            to="/reservations"
            className="dashboard-bottom__view-all"
          >
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </CardHeading>

        {recent.loading && (
          <p role="status">Loading recent reservations…</p>
        )}

        {!recent.loading && recent.status !== "ready" && (
          <div className="dashboard-bottom__feedback">
            <p role="alert">
              {recent.status === "denied"
                ? "Your account cannot view these reservations."
                : "Recent reservations could not be loaded."}
            </p>

            <button
              type="button"
              className="dashboard-screen__refresh"
              onClick={recent.reload}
            >
              Try again
            </button>
          </div>
        )}

        {recent.status === "ready" && (
          <>
            {recentItems.length === 0 ? (
              <p className="dashboard-bottom__empty">
                No reservations have been recorded yet.
              </p>
            ) : (
              <ul className="dashboard-bottom__reservations">
                {recentItems.slice(0, 3).map((item) => (
                  <ReservationPreview key={item.id} item={item} />
                ))}
              </ul>
            )}

            {recentItems.length > 3 && (
              <details className="dashboard-bottom__details">
                <summary>
                  <ExpandLabel>
                    Show {recentItems.length - 3} more recent bookings
                  </ExpandLabel>
                </summary>

                <ul className="dashboard-bottom__reservations">
                  {recentItems.slice(3).map((item) => (
                    <ReservationPreview key={item.id} item={item} />
                  ))}
                </ul>
              </details>
            )}

            <p className="dashboard-bottom__meta">
              Latest {recentItems.length} ·{" "}
              {recent.data.total.toLocaleString("en-PH")} reservations
              total
            </p>
          </>
        )}
      </section>

      <section
        className="dashboard-bottom__card"
        aria-labelledby="dashboard-finance-title"
      >
        <CardHeading
          Icon={Coins}
          title="Financial Overview"
          id="dashboard-finance-title"
        />

        {financial.status === "hidden" ? (
          <p className="dashboard-bottom__empty">
            Financial information is available to authorized staff.
          </p>
        ) : (
          <>
            <p className="dashboard-bottom__label">
              Net accommodation collections today
            </p>

            <p className="dashboard-bottom__amount">
              {collections}
            </p>

            {financial.status === "loading" && (
              <p role="status" className="dashboard-bottom__muted">
                Checking financial records…
              </p>
            )}

            {financial.status === "error" && (
              <p role="alert" className="dashboard-bottom__warning">
                Financial figures are unavailable. Refresh the Dashboard.
              </p>
            )}

            {financialReview && (
              <p role="alert" className="dashboard-bottom__warning">
                Payment records require review. Settlement totals
                are unavailable.
              </p>
            )}

            {financialReady && (
              <dl className="dashboard-bottom__values">
                <div>
                  <dt>Verified receipts</dt>
                  <dd>{formatPesos(finance.collectionsCentavos)}</dd>
                </div>
                <div>
                  <dt>Completed refunds</dt>
                  <dd>{formatPesos(finance.refundsCentavos)}</dd>
                </div>
              </dl>
            )}

            <details className="dashboard-bottom__details">
              <summary>
                <ExpandLabel>Collection details</ExpandLabel>
              </summary>

              <div className="dashboard-bottom__expanded">
                <p className="dashboard-bottom__muted">
                  Verified accommodation receipts minus completed
                  accommodation refunds, before provider fees.
                  Deposits and additional-charge receipts are excluded.
                </p>

                {financial.status === "ready" && finance && (
                  <p className="dashboard-bottom__meta">
                    Updated {formatTimestamp(finance.asOf)},
                    Philippine time.
                  </p>
                )}
              </div>
            </details>
          </>
        )}
      </section>

      <section
        className="dashboard-bottom__card"
        aria-labelledby="dashboard-reminders-title"
      >
        <CardHeading
          Icon={Bell}
          title="Guest Reminders"
          id="dashboard-reminders-title"
        />

        {contactData ? (
          <>
            <dl className="dashboard-bottom__counts">
              <div data-attention={contactData.total > 0}>
                <dt>Booking requests</dt>
                <dd>{contactData.total.toLocaleString("en-PH")}</dd>
              </div>

              <div
                data-attention={contactData.followUps.total > 0}
              >
                <dt>Arrival reminders</dt>
                <dd>
                  {contactData.followUps.total.toLocaleString("en-PH")}
                </dd>
              </div>
            </dl>

            {(firstRequest || firstReminder) && (
              <ul className="dashboard-bottom__preview-list">
                {firstRequest && (
                  <li>
                    <span>Request preview</span>
                    <Link
                      to={`/reservations/${encodeURIComponent(firstRequest.id)}`}
                    >
                      {guestName(firstRequest.guest)}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                )}

                {firstReminder && (
                  <li>
                    <span>Reminder preview</span>
                    <Link
                      to={`/reservations/${encodeURIComponent(firstReminder.id)}`}
                    >
                      {guestName(firstReminder.guest)}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                )}
              </ul>
            )}

            {hasPassedDeadline && (
              <p className="dashboard-bottom__warning" role="status">
                Loaded requests include a passed deadline.
                Review the latest reservation state.
              </p>
            )}

            {!firstRequest && !firstReminder && (
              <p className="dashboard-bottom__empty">
                No guest contact work is currently due.
              </p>
            )}
          </>
        ) : (
          <p
            className="dashboard-bottom__muted"
            role={contacts.status === "loading" ? "status" : "alert"}
          >
            {contacts.status === "loading"
              ? "Loading guest reminders…"
              : contacts.status === "denied"
                ? "Your account cannot view guest reminders."
                : "Guest reminders are unavailable. Open details to retry."}
          </p>
        )}

        <details
          id="guest-reminders"
          ref={remindersRef}
          className="dashboard-bottom__details"
        >
          <summary>
            <ExpandLabel>View requests and reminders</ExpandLabel>
          </summary>

          <div className="dashboard-bottom__expanded">
            <DashboardGuestReminders
              contacts={contacts}
              mode={contactMode}
              onModeChange={onContactModeChange}
            />
          </div>
        </details>
      </section>

      <section
        className="dashboard-bottom__card"
        aria-labelledby="dashboard-queues-title"
      >
        <CardHeading
          Icon={ClipboardList}
          title="Operational Queues"
          id="dashboard-queues-title"
        />

        {queueData ? (
          <>
            <dl className="dashboard-bottom__values dashboard-bottom__queue-values">
              {queueDefinitions
                .filter(({ key }) => queueData[key] !== null)
                .map(({ key, label }) => (
                  <div
                    key={key}
                    data-attention={queueData[key].total > 0}
                  >
                    <dt>{label}</dt>
                    <dd>{queueData[key].total.toLocaleString("en-PH")}</dd>
                  </div>
                ))}
            </dl>

            <p className="dashboard-bottom__muted">
              Counts are separate queues. Open a reservation to
              review its available actions.
            </p>
          </>
        ) : (
          <p
            className="dashboard-bottom__muted"
            role={attention.status === "loading" ? "status" : "alert"}
          >
            {attention.status === "loading"
              ? "Loading operational queues…"
              : attention.status === "denied"
                ? "Your account cannot view these queues."
                : "Operational queues are unavailable. Open details to retry."}
          </p>
        )}

        <details className="dashboard-bottom__details">
          <summary>
            <ExpandLabel>Review operational records</ExpandLabel>
          </summary>

          <div className="dashboard-bottom__expanded">
            <DashboardOperationalQueues attention={attention} />
          </div>
        </details>
      </section>
    </div>
  );
}