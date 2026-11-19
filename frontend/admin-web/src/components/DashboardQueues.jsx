import { useState } from "react";
import { Link } from "react-router";

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

function QueuePanel({ state, label, queues, asOf }) {
  const [selectedKey, setSelectedKey] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (state.status === "loading") {
    return <p role="status">Loading {label}…</p>;
  }

  if (state.status !== "ready") {
    return (
      <div className="refined-queues__feedback">
        <p role="alert">
          {state.status === "denied"
            ? `Your account cannot view ${label}.`
            : `${label} could not be loaded.`}
        </p>
        <button
          type="button"
          className="dashboard-screen__refresh"
          onClick={state.reload}
        >
          Try again
        </button>
      </div>
    );
  }

  const selected =
    queues.find((queue) => queue.key === selectedKey) ||
    queues.find((queue) => queue.total > 0) ||
    queues[0];

  if (!selected) {
    return <p>No queues are available for this account.</p>;
  }

  const visible = expanded
    ? selected.items
    : selected.items.slice(0, 5);

  return (
    <div className="refined-queues">
      {queues.length > 1 && (
        <div
            className="refined-queues__choices"
            role="group"
            aria-label={`Choose ${label}`}
        >
            {queues.map((queue) => (
            <button
                key={queue.key}
                type="button"
                aria-pressed={selected.key === queue.key}
                onClick={() => {
                setSelectedKey(queue.key);
                setExpanded(false);
                }}
            >
                {queue.label}
                <span>{queue.total.toLocaleString("en-PH")}</span>
            </button>
            ))}
        </div>
        )}

      <p className="dashboard-screen__muted">
        {selected.description}
      </p>

      {visible.length === 0 ? (
        <p className="refined-queues__empty">
          No records currently need attention in this queue.
        </p>
      ) : (
        <ul className="refined-queues__list">
          {visible.map((item) => (
            <li key={item.id}>
              <div>
                <Link to={item.to}>{item.title}</Link>
                <p className="refined-queues__reference">
                  {item.reference}
                </p>

                {item.details.map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}

                {item.warning && (
                  <p className="refined-queues__warning">
                    {item.warning}
                  </p>
                )}
              </div>

              {item.amountCentavos !== undefined && (
                <strong>
                  {formatPesos(item.amountCentavos)}
                </strong>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="refined-queues__footer">
        <p className="dashboard-screen__muted">
          Showing {visible.length} of {selected.total} records.
        </p>

        {selected.items.length > 5 && (
          <button
            type="button"
            className="dashboard-screen__refresh"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Show fewer"
              : `Show ${selected.items.length} loaded records`}
          </button>
        )}
      </div>

      <p className="dashboard-screen__updated">
        Checked {formatTimestamp(asOf)}, Philippine time.
        {" "}Up to 20 records are loaded per queue.
      </p>

      <p className="dashboard-screen__muted">
        Open a reservation to review current records and available
        actions. Viewing a queue does not apply an operation.
      </p>
    </div>
  );
}

export function DashboardGuestReminders({ contacts, mode, onModeChange }) {
  const data = contacts.status === "ready" ? contacts.data : null;

  const queues = data
    ? [
        {
          key: "requests",
          label: "Booking requests",
          total: data.total,
          description:
            "Pending Pay at Property requests, oldest first.",
          items: data.items.map((item) => ({
            id: item.id,
            title: guestName(item.guest),
            reference: item.reservationNumber,
            to: `/reservations/${encodeURIComponent(item.id)}`,
            details: [
              item.attention === "INITIAL_CONTACT_NEEDED"
                ? "Initial contact needed"
                : "Awaiting confirmation",
              `Arrival: ${
                item.expectedArrivalAt
                  ? formatTimestamp(item.expectedArrivalAt)
                  : "Not recorded"
              }`,
              `Deadline: ${
                item.deadlineAt
                  ? formatTimestamp(item.deadlineAt)
                  : "Not recorded — review required"
              }`,
            ],
            warning: item.deadlineReached
              ? "Deadline passed — check the current reservation state."
              : "",
          })),
        },
        {
          key: "reminders",
          label: "Arrival reminders",
          total: data.followUps.total,
          description:
            "Record the matching contact purpose in reservation details. A Reached result clears that reminder.",
          items: data.followUps.items.map((item) => ({
            id: item.id,
            title: guestName(item.guest),
            reference: item.reservationNumber,
            to: `/reservations/${encodeURIComponent(item.id)}`,
            details: [
              PURPOSES[item.purpose],
              `Due since: ${formatTimestamp(item.dueAt)}`,
              `Arrival: ${formatTimestamp(item.expectedArrivalAt)}`,
            ],
          })),
        },
      ]
    : [];

  const selected = queues.find((queue) => queue.key === mode);

  return (
    <>
      <div
        className="refined-queues__choices"
        role="group"
        aria-label="Guest contact category"
      >
        <button
          type="button"
          aria-pressed={mode === "requests"}
          onClick={() => onModeChange("requests")}
        >
          Booking requests
          {data && <span>{data.total}</span>}
        </button>

        <button
          type="button"
          aria-pressed={mode === "reminders"}
          onClick={() => onModeChange("reminders")}
        >
          Arrival reminders
          {data && <span>{data.followUps.total}</span>}
        </button>
      </div>

      <QueuePanel
        key={mode}
        state={contacts}
        label="guest contact records"
        queues={selected ? [selected] : []}
        asOf={data?.asOf}
      />
    </>
  );
}

export function DashboardOperationalQueues({ attention }) {
  const data = attention.status === "ready" ? attention.data : null;

  const definitions = [
    {
      key: "chargeApprovals",
      label: "Charge approvals",
      description:
        "Proposed charges awaiting approval. These amounts are not recorded collections.",
    },
    {
      key: "depositReturns",
      label: "Deposit returns",
      description:
        "Authorized returns awaiting cash handover. Approval does not establish that cash was returned.",
    },
    {
      key: "extensionCorrections",
      label: "Extension corrections",
      description:
        "Unfulfilled extensions requiring cash-return or deposit-restoration review.",
    },
  ];

  const queues = data
    ? definitions
        .filter(({ key }) => data[key] !== null)
        .map((definition) => ({
          ...definition,
          total: data[definition.key].total,
          items: data[definition.key].items.map((item) => ({
            id: item.id,
            title: item.label,
            reference: item.reservationNumber,
            to: `/reservations/${encodeURIComponent(item.reservationId)}`,
            details: [
              `Recorded: ${formatTimestamp(item.createdAt)}`,
            ],
            amountCentavos: item.amountCentavos,
          })),
        }))
    : [];

  return (
    <>
      <QueuePanel
        state={attention}
        label="operational queues"
        queues={queues}
        asOf={data?.asOf}
      />

      {data?.canReviewReconciliation && (
        <p className="refined-queues__reconciliation">
          <Link to="/payments/reconciliation">
            Open payment reconciliation
          </Link>
        </p>
      )}
    </>
  );
}