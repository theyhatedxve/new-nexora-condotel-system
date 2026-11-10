import { useStaffData } from "./useStaffData";
import { getCollectionsReport } from "../services/reportsApi";

export default function useCollectionsReport({ query }) {
  const state = useStaffData(getCollectionsReport, query);

  const data = state.status === "ready" ? state.data : null;

  return { state, data };
}
