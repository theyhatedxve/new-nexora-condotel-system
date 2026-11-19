import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BedDouble,
  Brush,
  CalendarCheck,
  CalendarDays,
  LogOut,
  MessageSquare,
  RefreshCw,
  Wallet,
} from "lucide-react";

import DashboardBottomGrid from "../components/DashboardBottomGrid.jsx";
import useDashboardPage from "../hooks/useDashboardPage.js";

import {
  formatPesos,
  formatTimestamp,
} from "../../../shared/utils/formatters.js";

import "../styles/dashboard.css";
import "../styles/dashboard-refined.css";
import "../styles/dashboard-bottom-grid.css";

function count(state, key = "total") {
  if (state.status === "ready") {
    return state.data[key].toLocaleString("en-PH");
  }

  return state.status === "loading" ? "…" : "—";
}

function OperationCard({
  Icon,
  title,
  description,
  value,
  to,
  onClick,
  priority,
}) {
  const Control = to ? Link : "button";
  const controlProps = to
    ? { to }
    : { type: "button", onClick };

  return (
    <li className="daily-workflow__step">
      <Control
        {...controlProps}
        className={
          "daily-workflow__control" +
          (priority ? " daily-workflow__control--priority" : "")
        }
      >
        <Icon size={24} aria-hidden="true" />

        <span className="daily-workflow__text">
          <strong>{title}</strong>
          <span>{description}</span>
        </span>

        <span
          className="daily-workflow__count"
          aria-label={
            value === "…"
              ? "Loading count"
              : value === "—"
                ? "Count unavailable"
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
        <Icon size={25} aria-hidden="true" />
      </span>

      <div>
        <p className="daily-metric__value">{value}</p>
        <h2>{title}</h2>
        {description && (
          <p className="daily-metric__description">{description}</p>
        )}
      </div>
    </article>
  );
}

function LoadIssue({ state, label }) {
  if (
    ["ready", "loading", "hidden"].includes(state.status)
  ) {
    return null;
  }

  return (
    <p className="dashboard-screen__error" role="alert">
      {state.status === "denied"
        ? `Your account cannot view ${label}.`
        : `${label} could not be loaded. Refresh or open its section to retry.`}
    </p>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const remindersRef = useRef(null);
  const [contactMode, setContactMode] = useState("requests");

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

  function openRequests() {
    setContactMode("requests");

    const panel = remindersRef.current;
    if (!panel) return;

    panel.open = true;
    panel.querySelector("summary")?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start", behavior: "instant" });
  }

  useEffect(() => {
    if (location.hash !== "#guest-reminders") return;

    const panel = remindersRef.current;
    if (!panel) return;

    panel.open = true;
    panel.querySelector("summary")?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start", behavior: "instant" });
  }, [location.hash, location.key]);

  const arrivalSearch = new URLSearchParams({
    status: "CONFIRMED",
  });

  if (operations.status === "ready") {
    arrivalSearch.set("checkInFrom", operations.data.date);
    arrivalSearch.set("checkInTo", operations.data.date);
  }

  const financialReady =
    financial.status === "ready" &&
    finance?.status === "READY";

  const financialReview =
    financial.status === "ready" &&
    finance?.status === "REVIEW_REQUIRED";

  const collections = financialReady
    ? formatPesos(finance.netCollectionsCentavos)
    : financialReview
      ? "Review required"
      : financial.status === "loading"
        ? "Loading…"
        : "Unavailable";

  const occupancy = operations.status === "ready"
    ? `${(
        operations.data.totalRooms === 0
          ? 0
          : operations.data.occupiedRooms /
            operations.data.totalRooms * 100
      ).toFixed(1)}% occupancy`
    : "Occupancy unavailable";

  return (
    <section
      className="dashboard-screen daily-dashboard dashboard-refined"
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
              Review requests, welcome guests, and prepare rooms.
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
          <OperationCard
            Icon={MessageSquare}
            title="Requests"
            description="Pending guest agreement"
            value={count(contacts)}
            onClick={openRequests}
            priority={
              contacts.status === "ready" &&
              contacts.data.total > 0
            }
          />

          <OperationCard
            Icon={CalendarCheck}
            title="Arrivals"
            description="Confirmed arrivals today"
            value={count(operations, "expectedArrivals")}
            to={`/reservations?${arrivalSearch.toString()}`}
          />

          <OperationCard
            Icon={LogOut}
            title="Departures"
            description="Due today · view checked-in stays"
            value={count(operations, "expectedDepartures")}
            to="/reservations?status=CHECKED_IN"
          />

          <OperationCard
            Icon={Brush}
            title="Room Preparation"
            description="Rooms awaiting cleaning"
            value={count(cleaningRooms)}
            to="/rooms?status=CLEANING&isActive=true"
          />
        </ol>
      </section>

      <LoadIssue state={operations} label="Operational figures" />
      <LoadIssue state={cleaningRooms} label="Room-preparation count" />

      <div className="daily-dashboard__metrics">
        <Metric
          Icon={BedDouble}
          tone="blue"
          title="Total Rooms"
          value={countValue("totalRooms")}
          description="Configured physical rooms"
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
          description="Includes inventory-held requests"
        />

        {financial.status !== "hidden" && (
          <Metric
            Icon={Wallet}
            tone="gold"
            title="Net Collections Today"
            value={collections}
            description="Accommodation receipts after refunds"
          />
        )}
      </div>

      {operations.status === "ready" && (
        <p className="dashboard-screen__updated">
          Updated {formatTimestamp(operations.data.asOf)},
          Philippine time.
        </p>
      )}

      <LoadIssue state={financial} label="Financial summary" />
      <LoadIssue state={contacts} label="Guest reminders" />
      <LoadIssue state={attention} label="Operational queues" />

      {financialReview && (
        <p className="dashboard-screen__review" role="alert">
          Payment records require financial review.
          Collection totals are unavailable.
        </p>
      )}

      <DashboardBottomGrid
        recent={recent}
        recentItems={recentItems}
        financial={financial}
        finance={finance}
        collections={collections}
        contacts={contacts}
        attention={attention}
        remindersRef={remindersRef}
        contactMode={contactMode}
        onContactModeChange={setContactMode}
      />
    </section>
  );
}