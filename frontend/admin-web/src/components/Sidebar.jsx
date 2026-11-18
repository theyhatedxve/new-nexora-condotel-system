import { NavLink, useLocation } from "react-router";
import {
  BedDouble,
  ChevronDown,
  Hotel,
  LogOut,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import {
  canVisit,
  ROLE_LABELS,
  staffNavigation,
} from "../auth/staffNavigation";

const additionalLinks = [
  {
    path: "/rooms/types",
    label: "Room Types",
    icon: BedDouble,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    path: "/payments/reconciliation",
    label: "Reconciliation",
    icon: Wallet,
    roles: ["SUPER_ADMIN"],
  },
];

const linksByPath = new Map(
  [...staffNavigation, ...additionalLinks].map((item) => [
    item.path,
    item,
  ]),
);

const sections = [
  {
    title: "Operations",
    paths: ["/", "/reservations"],
  },
  {
    title: "Property",
    label: "Rooms & Inventory",
    icon: BedDouble,
    paths: ["/rooms", "/rooms/types"],
  },
  {
    title: "Guest Management",
    label: "Guests & Accounts",
    icon: Users,
    paths: ["/guests", "/guest-accounts"],
  },
  {
    title: "Finance",
    label: "Payments",
    icon: Wallet,
    paths: ["/payments", "/payments/reconciliation"],
  },
  {
    title: "Access & Security",
    paths: ["/nfc", "/users", "/audit-logs"],
  },
  {
    title: "Analytics & Settings",
    paths: ["/reports", "/settings"],
  },
];

function matchesPath(path, pathname) {
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(path + "/");
}

function NavigationLink({ item, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === "/" || item.path === "/rooms"}
      onClick={onNavigate}
      className={({ isActive }) =>
        "nav-link" + (isActive ? " active" : "")
      }
    >
      <Icon size={21} aria-hidden="true" />
      <span>{item.label}</span>

      {item.path === "/nfc" && (
        <small className="sidebar-postponed">Postponed</small>
      )}
    </NavLink>
  );
}

export default function Sidebar({
  user,
  open,
  onNavigate,
  onSignOut,
}) {
  const { pathname } = useLocation();

  return (
    <aside
      id="staff-navigation"
      className={"sidebar" + (open ? " sidebar-open" : "")}
    >
      <div className="sidebar-brand">
        <Hotel size={42} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <strong>NEXORA</strong>
          <span>Condotel Management</span>
        </div>
      </div>

      <nav aria-label="Staff navigation">
        {sections.map((section) => {
          const items = section.paths
            .map((path) => linksByPath.get(path))
            .filter((item) => item && canVisit(item, user.role));

          if (items.length === 0) return null;

          const active = items.some((item) =>
            matchesPath(item.path, pathname),
          );
          const Icon = section.icon;

          return (
            <section
              key={section.title}
              className="sidebar-section"
              aria-label={section.title}
            >
              <h2>{section.title}</h2>

              {section.label && items.length > 1 ? (
                <details
                  className="sidebar-group"
                  open={active}
                >
                  <summary
                    className="sidebar-group__summary"
                    data-active={active}
                  >
                    <Icon size={21} aria-hidden="true" />
                    <span>{section.label}</span>
                    <ChevronDown
                      size={17}
                      className="sidebar-group__chevron"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="sidebar-group__links">
                    {items.map((item) => (
                      <NavigationLink
                        key={item.path}
                        item={item}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                </details>
              ) : (
                items.map((item) => (
                  <NavigationLink
                    key={item.path}
                    item={item}
                    onNavigate={onNavigate}
                  />
                ))
              )}
            </section>
          );
        })}
      </nav>

      <details
        className="sidebar-account"
        data-account-menu
      >
        <summary>
          <span className="sidebar-account__avatar">
            <UserRound size={25} aria-hidden="true" />
          </span>
          <span className="sidebar-account__identity">
            <strong>{ROLE_LABELS[user.role]}</strong>
            <span>{user.email}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>

        <button type="button" onClick={onSignOut}>
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </details>
    </aside>
  );
}