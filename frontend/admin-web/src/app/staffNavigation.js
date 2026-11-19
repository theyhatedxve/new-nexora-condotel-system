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
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "RECEPTIONIST",
];

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Administrator",
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
    path: "/guest-accounts",
    label: "Guest Accounts",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN"],
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
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    path: "/users",
    label: "User Management",
    icon: UserCog,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
  {
    path: "/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    roles: ["SUPER_ADMIN"],
  },
];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function canVisit(item, role) {
  return !item.unavailable && item.roles.includes(role);
}
