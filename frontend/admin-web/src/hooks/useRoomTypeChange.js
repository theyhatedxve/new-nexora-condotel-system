import { useRoomChange } from "./useRoomChange";

import {
  createRoomTypeChangeRequest,
  sendRoomTypeChange,
} from "../services/roomTypesApi";

export function useRoomTypeChange(records) {
  return useRoomChange({
    scope: "/rooms/types",
    sources: [records],
    onReload: records.reload,
    createRequest: createRoomTypeChangeRequest,
    sendRequest: sendRoomTypeChange,
  });
}