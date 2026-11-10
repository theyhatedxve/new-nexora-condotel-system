import { useLocation, useParams } from "react-router";
import { useStaffData } from "./useStaffData";
import {
  getRoom,
  getRoomBlocks,
  parseRoomListQuery,
  roomListSearch,
} from "../services/roomsApi";
import { useAuth } from "../auth/useAuth";

export default function useRoomDetailsPage() {
  const { roomId } = useParams();

  const location = useLocation();

  let returnSearch = "";

  const savedSearch = location.state?.roomListSearch;

  if (typeof savedSearch === "string" && savedSearch.length <= 2000) {
    try {
      returnSearch = roomListSearch(parseRoomListQuery(savedSearch));
    } catch {
      returnSearch = "";
    }
  }

  const room = useStaffData(getRoom, roomId);

  const blocks = useStaffData(getRoomBlocks, roomId);

  const { user } = useAuth();

  const canManage = ["ADMIN", "MANAGER"].includes(user?.role);

  function refresh() {
    room.reload();
    blocks.reload();
  }

  return { roomId, returnSearch, room, blocks, canManage, refresh };
}
