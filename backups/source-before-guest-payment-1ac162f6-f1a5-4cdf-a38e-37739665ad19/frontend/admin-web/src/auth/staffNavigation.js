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

export const STAFF_ROLES = [
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
];

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
};

export const staffNavigation = [
  {
    path: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: STAFF_ROLES,
  },
  {
    path: "/reservations",
    label: "Reservations",
    icon: CalendarDays,
    roles: STAFF_ROLES,
  },
  {
    path: "/rooms",
    label: "Rooms",
    icon: BedDouble,
    roles: STAFF_ROLES,
  },
  {
    path: "/guests",
    label: "Guests",
    icon: Users,
    roles: STAFF_ROLES,
  },
  {
    path: "/payments",
    label: "Payments",
    icon: Wallet,
    roles: STAFF_ROLES,
  },
  {
    path: "/nfc",
    label: "NFC Management",
    icon: CreditCard,
    roles: STAFF_ROLES,
  },
  {
    path: "/reports",
    label: "Reports",
    icon: ChartColumn,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/users",
    label: "User Management",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
  {
    path: "/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    roles: ["ADMIN"],
  },
];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function canVisit(item, role) {
  return !item.unavailable && item.roles.includes(role);
}