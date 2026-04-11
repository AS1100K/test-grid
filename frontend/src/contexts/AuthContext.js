import React, { createContext, useContext, useState } from "react";
import useToken from "../components/useToken";
import fetch_ from "../utils";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { token, setToken, removeToken } = useToken();
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    var res = await fetch_("POST", "/api/auth/login", {
      username,
      password,
    });

    if (res.success == true) {
      setToken(res.data.token);
      setUser({
        username: res.data.username,
        role: res.data.role,
        assigned_exam_id: res.data.assigned_exam_id,
      });

      return true;
    }

    return false;
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const value = {
    token,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
