import { api } from "./api.js";

export async function listRoomTypes() {
  const response = await api.get("/room-types");
  return response.data.data;
}

export async function getRoomType(roomTypeId) {
  const response = await api.get(`/room-types/${roomTypeId}`);
  return response.data.data;
}

export async function listRoomTypeImages(roomTypeId) {
  const response = await api.get(`/room-types/${roomTypeId}/images`);
  return response.data.data;
}

export async function listRoomTypeAmenities(roomTypeId) {
  const response = await api.get(`/room-types/${roomTypeId}/amenities`);
  return response.data.data;
}