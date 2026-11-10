import { BedDouble, LogIn, LogOut } from "lucide-react";

export const cards = [
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

export const quickLinkDescriptions = {
  "/reservations": "Review bookings, arrivals, and departures.",
  "/rooms": "Review physical rooms and operational status.",
  "/guests": "Find guest details and reservation history.",
  "/payments": "Review recorded payments and payment details.",
  "/reports": "Open operational and collections reports.",
};
