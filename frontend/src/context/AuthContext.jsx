import { createContext, useEffect, useState } from "react";
import { API_URL } from "../api";

export const AuthContext = createContext();

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("JWT parse error:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("access_token") || "");

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");

    if (!savedToken) {
      setIsAuthenticated(false);
      setUser(null);
      setToken("");
      return;
    }

    const payload = parseJwt(savedToken);

    if (!payload) {
      localStorage.removeItem("access_token");
      setIsAuthenticated(false);
      setUser(null);
      setToken("");
      return;
    }

    setToken(savedToken);
    setIsAuthenticated(true);
    setUser({
      id: payload.sub ? Number(payload.sub) : null,
      email: payload.email || "",
      role: payload.role || "viewer",
    });
  }, []);

  const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("LOGIN ERROR:", err);
      return false;
    }

    const data = await res.json();

    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);

    const payload = parseJwt(data.access_token);

    setIsAuthenticated(true);
    setUser({
      id: payload?.sub ? Number(payload.sub) : null,
      email: payload?.email || "",
      role: payload?.role || "viewer",
    });

    return true;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken("");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        user,
        role: user?.role || "viewer",
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}