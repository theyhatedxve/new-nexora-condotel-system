import { useRoomChange } from "./useRoomChange.js";

import {
  createRoomTypeChangeRequest,
  sendRoomTypeChange,
} from "../services/roomTypesApi.js";

export function useRoomTypeChange(records) {
  return useRoomChange({
    scope: "/rooms/types",
    sources: [records],
    onReload: records.reload,
    createRequest: createRoomTypeChangeRequest,
    sendRequest: sendRoomTypeChange,
  });
}