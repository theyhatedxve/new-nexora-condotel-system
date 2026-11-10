import { useLocation, useParams } from "react-router";
import { useStaffData } from "./useStaffData";
import { getGuest, guestListSearch, parseGuestListQuery } from "../services/guestsApi";

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
