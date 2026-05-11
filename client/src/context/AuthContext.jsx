import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

const STORAGE_USER = "user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
    } else {
      localStorage.removeItem("token");
    }
    if (nextUser) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_USER);
    }
    setToken(nextToken || null);
    setUser(nextUser || null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_USER);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_USER);
      }
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const t = localStorage.getItem("token");
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        persistSession(t, data.user);
      } catch {
        persistSession(null, null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [persistSession]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistSession(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persistSession(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    persistSession(null, null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
