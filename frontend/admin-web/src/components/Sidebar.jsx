
import { NavLink } from "react-router";

import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  CreditCard,
  Wallet,
  ChartColumn,
  UserCog,
  Settings,
  ScrollText,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Reservations", path: "/reservations", icon: CalendarDays },
  { name: "Rooms", path: "/rooms", icon: BedDouble },
  { name: "Guests", path: "/guests", icon: Users },
  { name: "NFC Management", path: "/nfc", icon: CreditCard },
  { name: "Payments", path: "/payments", icon: Wallet },
  { name: "Reports", path: "/reports", icon: ChartColumn },
  { name: "User Management", path: "/users", icon: UserCog },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Audit Logs", path: "/audit-logs", icon: ScrollText },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>NEXORA</h2>
        <p>ADMIN MANAGEMENT</p>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "menu-link active" : "menu-link"
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
