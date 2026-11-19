import axios from "axios";

function configuredBaseURL() {
  try {
    const url = new URL(import.meta.env.VITE_API_URL);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname.replace(/\/$/, "") !== "/api"
    ) {
      throw new Error();
    }

    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error(
      "Configure VITE_API_URL with the full NEXORA API URL ending in /api.",
    );
  }
}

const api = axios.create({
  baseURL: configuredBaseURL(),
  timeout: 10_000,
  withCredentials: true,
});

export async function checkBackend() {
  return (await api.get("/health")).data;
}

export default api;