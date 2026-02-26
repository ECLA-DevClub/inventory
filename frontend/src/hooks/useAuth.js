import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function useAuth() {
  const { isAuthenticated, login, logout, user } = useContext(AuthContext);
  return { isAuthenticated, login, logout, user };
}
