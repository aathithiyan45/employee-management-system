import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (user && user.access) {
    config.headers.Authorization = `Bearer ${user.access}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {
          refresh: user.refresh,
        });
        user.access = res.data.access;
        localStorage.setItem("user", JSON.stringify(user));
        original.headers.Authorization = `Bearer ${res.data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * logout() — blacklists the refresh token on the server, then clears local state.
 * Call this instead of directly clearing localStorage so the old refresh token
 * cannot be replayed after the user signs out.
 *
 * Usage (replace any existing localStorage.clear() + redirect pattern):
 *   import { logout } from "../axiosInstance";
 *   <button onClick={logout}>Sign out</button>
 */
export async function logout() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (user?.refresh) {
    try {
      await api.post("logout/", { refresh: user.refresh });
    } catch {
      // If the server call fails (token already expired etc.) still clear local state
    }
  }
  localStorage.clear();
  window.location.href = "/";
}

export default api;
