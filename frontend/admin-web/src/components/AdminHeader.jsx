import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  UserRound,
} from "lucide-react";

import { ROLE_LABELS } from "../auth/staffNavigation";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function PhilippineClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="admin-clock">
      <CalendarDays size={27} aria-hidden="true" />

      <time dateTime={now.toISOString()}>
        <strong>{dateFormatter.format(now)}</strong>
        <span>
          Philippine time · {timeFormatter.format(now)}
        </span>
      </time>
    </div>
  );
}

export default function AdminHeader({
  title,
  user,
  onSignOut,
}) {
  const { pathname } = useLocation();

  return (
    <header className="admin-header">
      <div className="admin-header__identity">
        <p className="eyebrow">NEXORA Management System</p>
        <p className="header-title">{title}</p>

        {pathname === "/" && (
          <p className="admin-header__description">
            Hotel operations at a glance
          </p>
        )}
      </div>

      <div className="admin-header__tools">
        <PhilippineClock />

        <Link
          to="/#guest-reminders"
          className="admin-icon-button"
          aria-label="Open guest reminders"
          title="Guest reminders"
        >
          <Bell size={25} aria-hidden="true" />
        </Link>

        <details
          className="admin-account-menu"
          data-account-menu
        >
          <summary aria-label="Open account menu">
            <UserRound size={26} aria-hidden="true" />
            <ChevronDown size={14} aria-hidden="true" />
          </summary>

          <div className="admin-account-menu__panel">
            <strong>{ROLE_LABELS[user.role]}</strong>
            <span>{user.email}</span>

            <button type="button" onClick={onSignOut}>
              <LogOut size={17} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}