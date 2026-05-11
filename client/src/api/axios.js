import axios from "axios";
import { triggerSessionExpired } from "./sessionBridge.js";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
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
