import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setSessionExpiredHandler } from "../api/sessionBridge.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function SessionExpiredBridge() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      const path = window.location.pathname;
      if (path === "/login" || path === "/register") return;
      const from = {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };
      logout();
      navigate("/login", { replace: true, state: { from, sessionExpired: true } });
    };
    setSessionExpiredHandler(handler);
    return () => setSessionExpiredHandler(null);
  }, [logout, navigate]);

  return null;
}
