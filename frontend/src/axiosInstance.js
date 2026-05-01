import axios from "axios";

// Access token is stored in memory only for XSS protection
let accessToken = null;

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  withCredentials: true,
});

export const setAccessToken = (token) => {
  accessToken = token;
};

// Interceptor to add Bearer token to requests
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Interceptor to handle 401 Unauthorized and token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    
    // If we get 401 and haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('token/refresh')) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token using httpOnly cookie
        const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {}, { withCredentials: true });
        
        accessToken = res.data.access;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (err) {
        // If refresh fails, session is truly dead
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(error);
  }
);

export async function logout() {
  try {
    await api.post("logout/");
  } catch (err) {
    console.error("Logout failed", err);
  } finally {
    accessToken = null;
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

export default api;
