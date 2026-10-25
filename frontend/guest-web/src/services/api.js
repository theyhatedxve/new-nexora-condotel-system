
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000, // Set a timeout for requests (in milliseconds)
});

export async function checkBackend() {
    const response = await api.get("/health");
    return response.data;
}