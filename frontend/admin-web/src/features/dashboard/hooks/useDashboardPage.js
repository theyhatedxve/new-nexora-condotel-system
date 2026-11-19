import { useAuth } from "../../auth/useAuth.js";
import { useDashboardSummary } from "./useDashboardSummary.js";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";

import { loadRecentReservations } from "../utils/dashboardHelpers.js";
import { loadDashboardContacts } from "../services/dashboardContactsApi.js";
import { loadDashboardAttention } from "../services/dashboardAttentionApi.js";
import { listRoomPage } from "../../rooms/services/roomsApi.js";

function loadCleaningRooms(_staffScope, signal) {
  return listRoomPage(
    {
      status: "CLEANING",
      isActive: "true",
      page: 1,
      limit: 20,
    },
    signal,
  );
}

export default function useDashboardPage() {
  const { user } = useAuth();
  const scope = `${user.id}:${user.role}`;

  const {
    operations,
    financial,
    loading,
    refresh,
  } = useDashboardSummary(user.role);

  const recent = useStaffData(loadRecentReservations, scope);
  const contacts = useStaffData(loadDashboardContacts, scope);
  const attention = useStaffData(loadDashboardAttention, scope);
  const cleaningRooms = useStaffData(loadCleaningRooms, scope);

  const finance = financial.data;
  const recentItems = recent.status === "ready"
    ? recent.data.items.slice(0, 5)
    : [];

  const refreshing =
    loading ||
    recent.loading ||
    contacts.loading ||
    attention.loading ||
    cleaningRooms.loading;

  function countValue(key) {
    if (operations.status === "ready") {
      return operations.data[key].toLocaleString("en-PH");
    }

    return operations.status === "error"
      ? "Unavailable"
      : "Loading…";
  }

  function refreshDashboard() {
    refresh();
    recent.reload();
    contacts.reload();
    attention.reload();
    cleaningRooms.reload();
  }

  return {
    operations,
    financial,
    recent,
    contacts,
    attention,
    cleaningRooms,
    finance,
    recentItems,
    refreshing,
    countValue,
    refreshDashboard,
  };
}