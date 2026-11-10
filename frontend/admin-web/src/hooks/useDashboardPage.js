import { useAuth } from "../auth/useAuth";
import { canVisit, staffNavigation } from "../auth/staffNavigation";
import { useDashboardSummary } from "./useDashboardSummary";
import { useStaffData } from "./useStaffData";
import { cards, quickLinkDescriptions } from "../constants/dashboard.js";
import { loadRecentReservations } from "../utils/dashboardHelpers.js";

export default function useDashboardPage() {
  const { user } = useAuth();

  const { operations, financial, loading, refresh } = useDashboardSummary(user.role);

  const recent = useStaffData(loadRecentReservations, `${user.id}:${user.role}`);

  const finance = financial.data;

  const recentItems = recent.status === "ready" ? recent.data.items.slice(0, 5) : [];

  const refreshing = loading || recent.loading;

  const quickLinks = staffNavigation.filter(
    (item) =>
      Object.hasOwn(quickLinkDescriptions, item.path) && canVisit(item, user.role),
  );

  const empty =
    operations.status === "ready" &&
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

  return {
    operations,
    financial,
    recent,
    finance,
    recentItems,
    refreshing,
    quickLinks,
    empty,
    countValue,
    refreshDashboard,
  };
}
