import { useLocation, useParams } from "react-router";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import { getGuest, guestListSearch, parseGuestListQuery } from "../services/guestsApi.js";

export default function useGuestDetailsPage() {
  const { guestId } = useParams();

  const location = useLocation();

  let returnSearch = "";

  const savedSearch = location.state?.guestListSearch;

  if (typeof savedSearch === "string" && savedSearch.length <= 2000) {
    try {
      returnSearch = guestListSearch(parseGuestListQuery(savedSearch));
    } catch {
      returnSearch = "";
    }
  }

  const state = useStaffData(getGuest, guestId);

  const guest = state.data;

  return { returnSearch, state, guest };
}
