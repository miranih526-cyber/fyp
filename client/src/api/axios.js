import axios from "axios";
import { triggerSessionExpired } from "./sessionBridge.js";

/** Production: set to server origin + `/api`, e.g. `https://your-api.vercel.app/api` */
function productionApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

const apiBase = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : productionApiBase();

if (import.meta.env.PROD && !apiBase) {
  console.warn(
    "[fyp-client] VITE_API_BASE_URL is not set. Set it in the Vercel project to your deployed API (e.g. https://your-api.vercel.app)."
  );
}

const api = axios.create({
  baseURL: apiBase,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (config.headers["Content-Type"] == null) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || "");
    const hadAuth = Boolean(error.config?.headers?.Authorization);
    if (
      status === 401 &&
      hadAuth &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/register")
    ) {
      triggerSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default api;
