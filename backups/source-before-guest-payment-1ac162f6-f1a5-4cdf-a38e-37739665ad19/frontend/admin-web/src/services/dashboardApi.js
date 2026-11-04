import api from "./api";

const counts = [
  "totalRooms",
  "occupiedRooms",
  "activeReservations",
  "expectedArrivals",
  "expectedDepartures",
];

function validMetadata(data) {
  return (
    data &&
    data.timezone === "Asia/Manila" &&
    typeof data.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.date) &&
    typeof data.asOf === "string" &&
    Number.isFinite(Date.parse(data.asOf))
  );
}

export async function getDashboardSummary(signal) {
  const response = await api.get(
    "/dashboard/summary",
    { signal },
  );

  const data = response.data?.data;

  if (
    !validMetadata(data) ||
    !counts.every(
      (key) =>
        Number.isSafeInteger(data[key]) &&
        data[key] >= 0,
    )
  ) {
    throw new Error(
      "Dashboard summary is unavailable.",
    );
  }

  return data;
}

export async function getFinancialSummary(signal) {
  const response = await api.get(
    "/dashboard/financial-summary",
    { signal },
  );

  const data = response.data?.data;

  const amounts = [
    "collectionsCentavos",
    "refundsCentavos",
    "netCollectionsCentavos",
  ];

  const ready =
    data?.status === "READY" &&
    amounts.every(
      (key) => Number.isSafeInteger(data[key]),
    ) &&
    data.collectionsCentavos >= 0 &&
    data.refundsCentavos >= 0 &&
    data.netCollectionsCentavos ===
      data.collectionsCentavos -
        data.refundsCentavos;

  const review =
    data?.status === "REVIEW_REQUIRED" &&
    amounts.every((key) => data[key] === null);

  if (
    !validMetadata(data) ||
    data.currency !== "PHP" ||
    (!ready && !review)
  ) {
    throw new Error(
      "Financial summary is unavailable.",
    );
  }

  return data;
}