import { Link } from "react-router";
import { Bell, RefreshCw } from "lucide-react";

import AdminDisclosure from "../../shared/components/AdminDisclosure.jsx";
import { useStaffData } from "../../shared/hooks/useStaffData.js";
import { loadDashboardContacts } from "../../features/dashboard/services/dashboardContactsApi.js";
import { loadDashboardAttention } from "../../features/dashboard/services/dashboardAttentionApi.js";
import { formatTimestamp } from "../../shared/utils/formatters.js";

const reminderLabels = {
  SHORT_NOTICE: "Short-notice contact",
  ONE_WEEK_REMINDER: "One-week reminder",
  ONE_DAY_REMINDER: "One-day reminder",
};

function NotificationGroup({ title, total, items }) {
  return (
    <section className="admin-notifications__group">
      <h3>
        {title} <span>{total}</span>
      </h3>

      {items.length === 0 ? (
        <p className="admin-notifications__muted">
          Nothing currently needs attention.
        </p>
      ) : (
        <>
          <ul className="admin-notifications__list">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/reservations/${encodeURIComponent(item.reservationId)}`}
                >
                  <strong>{item.reservationNumber}</strong>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="admin-notifications__muted">
            Showing {items.length} of {total}.
          </p>
        </>
      )}
    </section>
  );
}

function QueueState({ state, label }) {
  if (state.loading) {
    return <p role="status">Loading {label}…</p>;
  }

  if (state.status === "ready") return null;

  return (
    <p role="alert" className="admin-notifications__error">
      {state.status === "denied"
        ? `Your account cannot view ${label}.`
        : `${label} could not be loaded. Use Refresh to try again.`}
    </p>
  );
}

function AttentionNotifications({ title, queue }) {
  if (queue === null) return null;

  return (
    <NotificationGroup
      title={title}
      total={queue.total}
      items={queue.items.map((item) => ({
        id: item.id,
        reservationId: item.reservationId,
        reservationNumber: item.reservationNumber,
        label: item.label,
      }))}
    />
  );
}

function NotificationContent({ staffScope }) {
  const contacts = useStaffData(loadDashboardContacts, staffScope);
  const attention = useStaffData(loadDashboardAttention, staffScope);

  const contactsReady = contacts.status === "ready";
  const attentionReady = attention.status === "ready";
  const loading = contacts.loading || attention.loading;

  function refresh() {
    contacts.reload();
    attention.reload();
  }

  return (
    <section
      className="admin-notifications__panel"
      aria-labelledby="admin-notifications-title"
    >
      <header className="admin-notifications__heading">
        <div>
          <h2 id="admin-notifications-title">Notifications</h2>
          <p>Current reminders and items needing attention.</p>
        </div>

        <button
          type="button"
          className="admin-notifications__refresh"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="admin-notifications__source">
        <QueueState state={contacts} label="guest reminders" />

        {contactsReady && (
          <>
            <NotificationGroup
              title="Guest contact requests"
              total={contacts.data.total}
              items={contacts.data.items.map((item) => ({
                id: item.id,
                reservationId: item.id,
                reservationNumber: item.reservationNumber,
                label: item.deadlineReached
                  ? "Deadline passed — review the current reservation."
                  : item.attention === "INITIAL_CONTACT_NEEDED"
                    ? "Initial guest contact needed."
                    : "Awaiting guest confirmation.",
              }))}
            />

            <NotificationGroup
              title="Arrival reminders"
              total={contacts.data.followUps.total}
              items={contacts.data.followUps.items.map((item) => ({
                id: item.id,
                reservationId: item.id,
                reservationNumber: item.reservationNumber,
                label: reminderLabels[item.purpose],
              }))}
            />

            <p className="admin-notifications__muted">
              Guest reminders updated {formatTimestamp(contacts.data.asOf)},
              Philippine time.
            </p>
          </>
        )}
      </div>

      <div className="admin-notifications__source">
        <QueueState state={attention} label="operational alerts" />

        {attentionReady && (
          <>
            <AttentionNotifications
              title="Charges awaiting approval"
              queue={attention.data.chargeApprovals}
            />

            <AttentionNotifications
              title="Deposit returns awaiting completion"
              queue={attention.data.depositReturns}
            />

            {attention.data.canReviewReconciliation && (
              <AttentionNotifications
                title="Extension corrections"
                queue={attention.data.extensionCorrections}
              />
            )}

            <p className="admin-notifications__muted">
              Operational alerts updated{" "}
              {formatTimestamp(attention.data.asOf)}, Philippine time.
            </p>
          </>
        )}
      </div>

      <footer className="admin-notifications__footer">
        <p>
          Current queue items appear here until resolved. Opening this panel
          does not mark them completed.
        </p>

        <Link to="/reservations">Open reservations</Link>
      </footer>
    </section>
  );
}

export default function AdminNotifications({ user }) {
  const staffScope = `${user.id}:${user.role}`;

  return (
    <AdminDisclosure
      className="admin-notifications"
      label="Open notifications"
      summary={<Bell size={25} aria-hidden="true" />}
    >
      <NotificationContent staffScope={staffScope} />
    </AdminDisclosure>
  );
}