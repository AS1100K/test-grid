import { useEffect, useState } from "react";
import useToken from "../components/useToken";
import fetch_ from "../utils";
import { AuthContext } from "./useAuth";
import useNotification from "./useNotification";

export default function AuthProvider({ children }) {
  const { addNotification } = useNotification();

  const { token, setToken, removeToken } = useToken();
  const [user, setUser] = useState(null);

  const verify = async () => {
    var res = await fetch_("POST", "/api/auth/verify", {
      token,
    });

    if (res.success == true) {
      setUser({
        username: res.data.username,
        role: res.data.role,
        assigned_exam_id: res.data.assigned_exam_id,
      });

      return true;
    }

    setUser(null);
    removeToken();

    return false;
  };

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

    addNotification({ message: res.message });
    return false;
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = {
    token,
    verify,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
