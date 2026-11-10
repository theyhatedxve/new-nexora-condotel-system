import { Link } from "react-router";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../auth/useAuth";
import {
  canVisit,
  staffNavigation,
} from "../auth/staffNavigation";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useStaffData } from "../hooks/useStaffData";
import SummaryCard from "../components/SummaryCard";
import { listReservationPage } from "../services/reservationsApi";
import {
  formatPesos,
  formatStatus,
  formatStayDate,
  formatTimestamp,
  guestName,
} from "../utils/formatters";

import "../styles/dashboard.css";

const cards = [
  {
    key: "totalRooms",
    title: "Total rooms",
    description: "All configured physical rooms, including inactive rooms.",
    Icon: BedDouble,
    tone: "green",
  },
  {
    key: "occupiedRooms",
    title: "Occupied rooms",
    description: "Distinct rooms assigned to checked-in stays, including overdue stays.",
    Icon: BedDouble,
    tone: "gold",
  },
  {
    key: "expectedArrivals",
    title: "Arrivals today",
    description: "Confirmed reservations scheduled to arrive today.",
    Icon: LogIn,
    tone: "green",
  },
  {
    key: "expectedDepartures",
    title: "Departures today",
    description: "Checked-in reservations scheduled to leave today.",
    Icon: LogOut,
    tone: "rose",
  },
];

const quickLinkDescriptions = {
  "/reservations": "Review bookings, arrivals, and departures.",
  "/rooms": "Review physical rooms and operational status.",
  "/guests": "Find guest details and reservation history.",
  "/payments": "Review recorded payments and payment details.",
  "/reports": "Open operational and collections reports.",
};

function loadRecentReservations(_staffScope, signal) {
  // The existing API supports 20 or 50 rows; display only its newest five.
  return listReservationPage({ page: 1, limit: 20 }, signal);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { operations, financial, loading, refresh } =
    useDashboardSummary(user.role);

  // A change of staff identity or role must hide the previous list immediately.
  const recent = useStaffData(
    loadRecentReservations,
    `${user.id}:${user.role}`,
  );

  const finance = financial.data;
  const recentItems = recent.status === "ready"
    ? recent.data.items.slice(0, 5)
    : [];
  const refreshing = loading || recent.loading;
  const quickLinks = staffNavigation.filter(
    (item) =>
      Object.hasOwn(quickLinkDescriptions, item.path) &&
      canVisit(item, user.role),
  );

  const empty = operations.status === "ready" &&
    operations.data.activeReservations === 0 &&
    cards.every((card) => operations.data[card.key] === 0);

  function countValue(key) {
    if (operations.status === "ready") {
      return operations.data[key].toLocaleString("en-PH");
    }

    return operations.status === "error" ? "Unavailable" : "Loading…";
  }

  function refreshDashboard() {
    refresh();
    recent.reload();
  }

  return (
    <section className="dashboard-screen" aria-labelledby="dashboard-title">
      <header className="dashboard-screen__heading">
        <div>
          <p className="eyebrow">Hotel operations overview</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p className="dashboard-screen__context">
            <CalendarDays size={16} aria-hidden="true" />
            {operations.status === "ready"
              ? `${formatStayDate(operations.data.date)} · Philippine time`
              : "Philippine time (Asia/Manila)"}
          </p>
        </div>

        <button
          type="button"
          className="dashboard-screen__refresh"
          onClick={refreshDashboard}
          disabled={refreshing}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh dashboard"}
        </button>
      </header>

      {operations.status === "loading" && (
        <p role="status" className="dashboard-screen__message">
          Loading operational summaries…
        </p>
      )}
      {operations.status === "error" && (
        <p role="alert" className="dashboard-screen__message dashboard-screen__message--error">
          Operational summaries could not be loaded. Try Refresh dashboard.
        </p>
      )}
      {empty && (
        <p role="status" className="dashboard-screen__message">
          No operational records currently match these summaries.
        </p>
      )}

      <div className="dashboard-screen__metrics" aria-busy={operations.status === "loading"}>
        {cards.map(({ key, title, description, Icon, tone }) => (
          <div key={key} className="dashboard-screen__metric">
            <span className={`dashboard-screen__icon dashboard-screen__icon--${tone}`}>
              <Icon size={21} aria-hidden="true" />
            </span>
            <SummaryCard title={title} value={countValue(key)} description={description} />
          </div>
        ))}
      </div>

      {operations.status === "ready" && (
        <p className="dashboard-screen__updated">
          Operational figures as of {formatTimestamp(operations.data.asOf)}.
        </p>
      )}

      <div className="dashboard-screen__workspace">
        <div className="dashboard-screen__overview">
          <SummaryCard
            title="Active reservations"
            value={countValue("activeReservations")}
            description="Confirmed and checked-in reservations, plus unexpired pending holds."
          >
            <Link to="/reservations" className="dashboard-screen__text-link">
              View reservations <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </SummaryCard>

          {financial.status !== "hidden" && (
            <div aria-busy={financial.status === "loading"}>
              <SummaryCard
                title="Net collections today"
                value={
                  financial.status === "loading"
                    ? "Loading…"
                    : financial.status === "error"
                      ? "Unavailable"
                      : finance?.status === "REVIEW_REQUIRED"
                        ? "Review required"
                        : formatPesos(finance?.netCollectionsCentavos)
                }
                description="Verified receipts minus completed refunds today, before provider fees."
              >
                {financial.status === "loading" && (
                  <p role="status">Loading financial summary…</p>
                )}
                {financial.status === "error" && (
                  <p role="alert" className="dashboard-screen__error">
                    Financial summary could not be loaded. Try Refresh dashboard.
                  </p>
                )}
                {finance?.status === "REVIEW_REQUIRED" && (
                  <p role="alert" className="dashboard-screen__review">
                    Relevant payment records require financial review. Totals are unavailable.
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
                  </dl>
                )}
                {finance && (
                  <p className="dashboard-screen__updated">
                    Financial figures as of {formatTimestamp(finance.asOf)}.
                  </p>
                )}
              </SummaryCard>
            </div>
          )}
        </div>

        <section className="dashboard-screen__panel" aria-labelledby="dashboard-links-title">
          <h2 id="dashboard-links-title">Quick links</h2>
          <p className="dashboard-screen__muted">Open your daily staff tools.</p>
          <ul className="dashboard-screen__quick-links">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link to={item.path}>
                    <Icon size={19} aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <span>{quickLinkDescriptions[item.path]}</span>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="dashboard-screen__panel" aria-labelledby="dashboard-recent-title">
        <header className="dashboard-screen__section-heading">
          <div>
            <h2 id="dashboard-recent-title">Recent reservations</h2>
            <p className="dashboard-screen__muted">Most recently created first.</p>
          </div>
          <Link to="/reservations" className="dashboard-screen__text-link">
            View all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        {recent.loading && (
          <p role="status" className="dashboard-screen__message">Loading recent reservations…</p>
        )}
        {!recent.loading && recent.status !== "ready" && (
          <div className="dashboard-screen__message dashboard-screen__message--error">
            <p role="alert">
              {recent.status === "denied"
                ? "You do not have permission to view these reservations."
                : "Recent reservations could not be loaded. Other dashboard sections remain available."}
            </p>
            <button type="button" onClick={recent.reload}>Retry reservations</button>
          </div>
        )}
        {recent.status === "ready" && recentItems.length === 0 && (
          <p role="status" className="dashboard-screen__message">No reservations have been recorded yet.</p>
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
                <caption>Five newest reservations, or fewer when fewer exist</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Guest</th>
                    <th scope="col">Room type</th>
                    <th scope="col">Stay dates</th>
                    <th scope="col">Reservation status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">
                        <Link to={`/reservations/${encodeURIComponent(item.id)}`}>
                          {item.reservationNumber}
                        </Link>
                      </th>
                      <td>{guestName(item.guest)}</td>
                      <td>{item.roomType.name}</td>
                      <td>
                        <span className="dashboard-screen__stay-date">
                          Check-in: {formatStayDate(item.checkInDate)}
                        </span>
                        <span className="dashboard-screen__stay-date">
                          Check-out: {formatStayDate(item.checkOutDate)}
                        </span>
                      </td>
                      <td>
                        <span className="dashboard-screen__badge" data-status={item.status}>
                          {formatStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dashboard-screen__updated">
              Showing {recentItems.length} of {recent.data.total.toLocaleString("en-PH")} reservations.
              Select a reference to view its details.
            </p>
          </>
        )}
      </section>
    </section>
  );
}
