import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowRight,
  BedDouble,
  Bell,
  Brush,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Coins,
  LogOut,
  MessageSquare,
  RefreshCw,
  Wallet,
} from "lucide-react";

import DashboardContacts from "../components/DashboardContacts.jsx";
import DashboardAttention from "../components/DashboardAttention.jsx";
import useDashboardPage from "../hooks/useDashboardPage.js";

import {
  formatPesos,
  formatStatus,
  formatStayDate,
  formatTimestamp,
  guestName,
} from "../utils/formatters";

import "../styles/dashboard.css";

function workflowCount(state, key = "total") {
  if (state.status === "ready") {
    return state.data[key].toLocaleString("en-PH");
  }

  return state.status === "loading" ? "…" : "—";
}

function WorkflowStep({
  Icon,
  title,
  description,
  value,
  to,
  onClick,
  priority = false,
}) {
  const Control = to ? Link : "button";

  return (
    <li className="daily-workflow__step">
      <Control
        className={
          "daily-workflow__control" +
          (priority ? " daily-workflow__control--priority" : "")
        }
        to={to}
        type={to ? undefined : "button"}
        onClick={onClick}
      >
        <Icon size={28} aria-hidden="true" />

        <span className="daily-workflow__text">
          <strong>{title}</strong>
          <span>{description}</span>
        </span>

        <span
          className="daily-workflow__count"
          aria-label={
            value === "—"
              ? "Count unavailable"
              : value === "…"
                ? "Loading count"
                : `${value} items`
          }
        >
          {value}
        </span>
      </Control>
    </li>
  );
}

function Metric({ Icon, tone, title, value, description }) {
  return (
    <article className="daily-metric">
      <span className={`daily-metric__icon daily-metric__icon--${tone}`}>
        <Icon size={28} aria-hidden="true" />
      </span>

      <div>
        <p className="daily-metric__value">{value}</p>
        <h2>{title}</h2>
        <p className="daily-metric__description">{description}</p>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const remindersPanel = useRef(null);

  const {
    operations,
    financial,
    recent,
    contacts,
    attention,
    cleaningRooms,
    finance,
    recentItems,
    refreshing,
    countValue,
    refreshDashboard,
  } = useDashboardPage();

  function openReminders() {
    const panel = remindersPanel.current;

    if (!panel) return;

    panel.open = true;
    panel
      .querySelector("summary")
      ?.focus({ preventScroll: true });

    panel.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
  }

  useEffect(() => {
    if (location.hash !== "#guest-reminders") return;

    const panel = remindersPanel.current;
    if (!panel) return;

    panel.open = true;
    panel
      .querySelector("summary")
      ?.focus({ preventScroll: true });

    panel.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
  }, [location.hash, location.key]);

  const arrivalSearch = new URLSearchParams({
    status: "CONFIRMED",
  });

  if (operations.status === "ready") {
    arrivalSearch.set("checkInFrom", operations.data.date);
    arrivalSearch.set("checkInTo", operations.data.date);
  }

  const occupancy = operations.status === "ready"
    ? operations.data.totalRooms === 0
      ? "0% occupancy"
      : `${(
          operations.data.occupiedRooms /
          operations.data.totalRooms *
          100
        ).toFixed(1)}% of configured rooms`
    : "Occupancy unavailable";

  let collections = "Loading…";

  if (financial.status === "error") {
    collections = "Unavailable";
  } else if (finance?.status === "REVIEW_REQUIRED") {
    collections = "Review required";
  } else if (
    financial.status === "ready" &&
    finance?.status === "READY"
  ) {
    collections = formatPesos(finance.netCollectionsCentavos);
  }

  return (
    <section
      className="dashboard-screen daily-dashboard"
      aria-labelledby="dashboard-title"
    >
      <h1 id="dashboard-title" className="daily-dashboard__sr-only">
        Dashboard
      </h1>

      <section
        className="daily-workflow dashboard-screen__panel"
        aria-labelledby="daily-workflow-title"
      >
        <header className="dashboard-screen__section-heading">
          <div>
            <h2 id="daily-workflow-title">Today’s Operations</h2>
            <p className="dashboard-screen__muted">
              Follow the daily workflow to keep reservations and rooms on track.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-screen__refresh"
            onClick={refreshDashboard}
            disabled={refreshing}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <ol className="daily-workflow__list">
          <WorkflowStep
            Icon={MessageSquare}
            title="Review Requests"
            description="Pay at Property requests"
            value={workflowCount(contacts)}
            onClick={openReminders}
            priority
          />

          <WorkflowStep
            Icon={CalendarCheck}
            title="Process Arrivals"
            description="Confirmed arrivals today"
            value={workflowCount(operations, "expectedArrivals")}
            to={"/reservations?" + arrivalSearch.toString()}
          />

          <WorkflowStep
            Icon={LogOut}
            title="Process Departures"
            description="Departures due today"
            value={workflowCount(operations, "expectedDepartures")}
            to="/reservations?status=CHECKED_IN"
          />

          <WorkflowStep
            Icon={Brush}
            title="Prepare Rooms"
            description="Active rooms awaiting cleaning"
            value={workflowCount(cleaningRooms)}
            to="/rooms?status=CLEANING&isActive=true"
          />
        </ol>
      </section>

      {operations.status === "error" && (
        <p role="alert" className="dashboard-screen__error">
          Operational figures could not be loaded. Refresh the dashboard.
        </p>
      )}

      {!cleaningRooms.loading && cleaningRooms.status !== "ready" && (
        <p role="alert" className="dashboard-screen__error">
          The room-preparation count is unavailable. Open Rooms to review.
        </p>
      )}

      <div className="daily-dashboard__metrics">
        <Metric
          Icon={BedDouble}
          tone="blue"
          title="Total Rooms"
          value={countValue("totalRooms")}
          description="All configured physical rooms"
        />

        <Metric
          Icon={BedDouble}
          tone="green"
          title="Occupied Rooms"
          value={countValue("occupiedRooms")}
          description={occupancy}
        />

        <Metric
          Icon={CalendarDays}
          tone="purple"
          title="Active Reservations"
          value={countValue("activeReservations")}
          description="Confirmed, checked-in and inventory-held requests"
        />

        {financial.status !== "hidden" && (
          <Metric
            Icon={Wallet}
            tone="gold"
            title="Net Collections Today"
            value={collections}
            description="Accommodation collections after refunds"
          />
        )}
      </div>

      {operations.status === "ready" && (
        <p className="dashboard-screen__updated">
          Operational figures as of {formatTimestamp(operations.data.asOf)},
          Philippine time.
        </p>
      )}

      {financial.status === "error" && (
        <p role="alert" className="dashboard-screen__error">
          Financial figures could not be loaded. Refresh the dashboard.
        </p>
      )}

      {finance?.status === "REVIEW_REQUIRED" && (
        <p role="alert" className="dashboard-screen__review">
          Payment records require financial review. Collection totals are unavailable.
        </p>
      )}

      <section
        className="dashboard-screen__panel"
        aria-labelledby="dashboard-recent-title"
      >
        <header className="dashboard-screen__section-heading">
          <div className="daily-dashboard__panel-heading">
            <CalendarDays size={28} aria-hidden="true" />
            <div>
              <h2 id="dashboard-recent-title">Recent Reservations</h2>
              <p className="dashboard-screen__muted">
                Most recently created bookings.
              </p>
            </div>
          </div>

          <Link
            to="/reservations"
            className="daily-dashboard__outline-link"
          >
            View All Reservations
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </header>

        {recent.loading && (
          <p role="status">Loading recent reservations…</p>
        )}

        {!recent.loading && recent.status !== "ready" && (
          <div className="dashboard-screen__message">
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
              Retry reservations
            </button>
          </div>
        )}

        {recent.status === "ready" && recentItems.length === 0 && (
          <p role="status">No reservations have been recorded yet.</p>
        )}

        {recent.status === "ready" && recentItems.length > 0 && (
          <>
            <div
              className="dashboard-screen__table-scroll"
              role="region"
              aria-label="Recent reservations table"
              tabIndex={0}
            >
              <table className="dashboard-screen__table">
                <caption className="daily-dashboard__sr-only">
                  Five newest reservations, or fewer when fewer exist
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Guest</th>
                    <th scope="col">Room Type</th>
                    <th scope="col">Stay Period</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentItems.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">
                        <Link
                          to={
                            "/reservations/" +
                            encodeURIComponent(item.id)
                          }
                        >
                          {item.reservationNumber}
                        </Link>
                      </th>

                      <td>{guestName(item.guest)}</td>
                      <td>{item.roomType.name}</td>

                      <td>
                        <span className="dashboard-screen__stay-date">
                          {formatStayDate(item.checkInDate)}
                        </span>
                        <span className="dashboard-screen__stay-date">
                          to {formatStayDate(item.checkOutDate)}
                        </span>
                      </td>

                      <td>
                        <span
                          className="dashboard-screen__badge"
                          data-status={item.status}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="dashboard-screen__updated">
              Showing {recentItems.length} of{" "}
              {recent.data.total.toLocaleString("en-PH")} reservations.
            </p>
          </>
        )}
      </section>

      {financial.status !== "hidden" && (
        <details className="daily-dashboard__accordion">
          <summary>
            <Coins size={25} aria-hidden="true" />
            <strong>Financial Overview</strong>
            <span>Collections, refunds, and financial review</span>
            <ChevronDown
              size={19}
              className="daily-dashboard__chevron"
              aria-hidden="true"
            />
          </summary>

          <div className="daily-dashboard__accordion-body">
            <h2>Accommodation collections today</h2>
            <p className="dashboard-screen__muted">
              Verified accommodation receipts minus completed accommodation
              refunds, before provider fees. Deposits and additional-charge
              receipts are excluded.
            </p>

            {financial.status === "loading" && (
              <p role="status">Loading financial summary…</p>
            )}

            {financial.status === "error" && (
              <p role="alert">Financial summary is unavailable.</p>
            )}

            {finance?.status === "REVIEW_REQUIRED" && (
              <p role="alert" className="dashboard-screen__review">
                Relevant payment records require review.
              </p>
            )}

            {finance?.status === "READY" && (
              <dl className="dashboard-screen__breakdown">
                <div>
                  <dt>Verified receipts</dt>
                  <dd>{formatPesos(finance.collectionsCentavos)}</dd>
                </div>
                <div>
                  <dt>Completed refunds</dt>
                  <dd>{formatPesos(finance.refundsCentavos)}</dd>
                </div>
                <div>
                  <dt>Net collections</dt>
                  <dd>{formatPesos(finance.netCollectionsCentavos)}</dd>
                </div>
              </dl>
            )}

            {finance && (
              <p className="dashboard-screen__updated">
                Financial figures as of {formatTimestamp(finance.asOf)}.
              </p>
            )}
          </div>
        </details>
      )}

      <details
        id="guest-reminders"
        ref={remindersPanel}
        className="daily-dashboard__accordion"
      >
        <summary>
          <Bell size={25} aria-hidden="true" />
          <strong>Guest Reminders</strong>
          <span>Pending requests and arrival follow-ups</span>
          <ChevronDown
            size={19}
            className="daily-dashboard__chevron"
            aria-hidden="true"
          />
        </summary>

        <div className="daily-dashboard__accordion-body">
          <DashboardContacts contacts={contacts} />
        </div>
      </details>

      <details className="daily-dashboard__accordion">
        <summary>
          <ClipboardList size={25} aria-hidden="true" />
          <strong>Operational Queues</strong>
          <span>Charge approvals, deposit returns, and corrections</span>
          <ChevronDown
            size={19}
            className="daily-dashboard__chevron"
            aria-hidden="true"
          />
        </summary>

        <div className="daily-dashboard__accordion-body">
          <DashboardAttention attention={attention} />
        </div>
      </details>
    </section>
  );
}