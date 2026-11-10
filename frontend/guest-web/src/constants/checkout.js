export const API_SCOPE = new URL(
  import.meta.env.VITE_API_URL || "/",
  window.location.origin,
).href;
