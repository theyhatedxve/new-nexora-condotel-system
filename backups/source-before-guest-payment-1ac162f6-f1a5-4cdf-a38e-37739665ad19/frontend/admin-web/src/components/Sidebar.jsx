import { NavLink } from "react-router";

import {
  staffNavigation,
  canVisit,
} from "../auth/staffNavigation";

export default function Sidebar({
  role,
  open,
  onNavigate,
}) {
  return (
    <aside
      id="staff-navigation"
      className={
        "sidebar" + (open ? " sidebar-open" : "")
      }
    >
      <div className="sidebar-brand">
        NEXORA
        <span>Staff workspace</span>
      </div>

      <nav aria-label="Staff navigation">
        {staffNavigation
          .filter((item) => canVisit(item, role))
          .map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  "nav-link" +
                  (isActive ? " active" : "")
                }
              >
                <Icon
                  size={20}
                  aria-hidden="true"
                />

                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
    </aside>
  );
}