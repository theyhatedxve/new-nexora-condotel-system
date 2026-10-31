import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000, // Set a timeout for requests (in milliseconds)
});

// Backend image paths already start with /api (for example
// /api/room-images/abc/file), so they must be resolved against the
// API address instead of being appended to it.
const apiBase = new URL(import.meta.env.VITE_API_URL, window.location.origin);

export function toApiUrl(path) {
  return new URL(path, apiBase).href;
}

export async function checkBackend() {
  const response = await api.get("/health");
  return response.data;
}