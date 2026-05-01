import axios from "axios";

// Base URL from env — set REACT_APP_API_URL in production .env
const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/";

// Access token stored in memory only (never localStorage/sessionStorage) — XSS protection
let accessToken = null;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends httpOnly refresh-token cookie automatically
});

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// ── Request interceptor — attach Bearer token ──────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response interceptor — silent token refresh on 401 ─────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Attempt refresh once — guard against loops on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("token/refresh")
    ) {
      originalRequest._retry = true;

      try {
        // httpOnly cookie is sent automatically by withCredentials
        const res = await axios.post(
          `${BASE_URL}token/refresh/`,
          {},
          { withCredentials: true }
        );

        accessToken = res.data.access;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed — session is truly dead, send back to login
        accessToken = null;
        localStorage.removeItem("user");
        window.location.href = "/"; // Login is at "/" not "/login"
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// ── Logout — blacklists refresh token server-side ──────────
export async function logout() {
  try {
    await api.post("logout/");
  } catch (err) {
    // Continue logout even if server call fails
    console.error("Logout server call failed:", err);
  } finally {
    accessToken = null;
    localStorage.removeItem("user");
    window.location.href = "/"; // Login is at "/" not "/login"
  }
}

export default api;
