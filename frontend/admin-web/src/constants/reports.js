export const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export const timestamp = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export const operationalCards = [
  [
    "totalRooms",
    "Total rooms",
    "All configured physical rooms, including inactive rooms.",
  ],
  [
    "occupiedRooms",
    "Occupied rooms",
    "Distinct current assignments for checked-in stays, including overdue stays.",
  ],
  [
    "activeReservations",
    "Active reservations",
    "Confirmed and checked-in reservations, plus unexpired pending holds.",
  ],
  [
    "expectedArrivals",
    "Expected arrivals today",
    "Confirmed reservations scheduled to arrive today.",
  ],
  [
    "expectedDepartures",
    "Expected departures today",
    "Checked-in reservations scheduled to leave today.",
  ],
];

export const financialCards = [
  [
    "collectionsCentavos",
    "Verified collections",
    "Verified or recorded receipts paid within the selected dates.",
  ],
  [
    "refundsCentavos",
    "Completed refunds",
    "Refunds completed within the selected dates, including refunds of older receipts.",
  ],
  [
    "netCollectionsCentavos",
    "Net collections",
    "Verified collections minus completed refunds, before provider fees.",
  ],
];
