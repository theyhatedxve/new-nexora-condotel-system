import { useLocation, useParams } from "react-router";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import {
  getRoom,
  getRoomBlocks,
  parseRoomListQuery,
  roomListSearch,
} from "../services/roomsApi.js";
import { useAuth } from "../../auth/useAuth.js";

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

  const canManage = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user?.role);

  function refresh() {
    room.reload();
    blocks.reload();
  }

  return { roomId, returnSearch, room, blocks, canManage, refresh };
}
