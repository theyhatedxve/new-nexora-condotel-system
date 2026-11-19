import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import { getCollectionsReport } from "../services/reportsApi.js";

export default function useCollectionsReport({ query }) {
  const state = useStaffData(getCollectionsReport, query);

  const data = state.status === "ready" ? state.data : null;

  return { state, data };
}
