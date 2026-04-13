import { useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function useToken() {
  const getToken = () => {
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      return null;
    }

    try {
      const decoded = jwtDecode(accessToken);
      // eslint-disable-next-line react-hooks/purity
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        localStorage.removeItem("access_token");
        return null;
      }

      return accessToken;
    } catch {
      localStorage.removeItem("access_token");
      return null;
    }
  };

  const [token, setToken] = useState(getToken());

  const saveToken = (userToken) => {
    localStorage.setItem("access_token", userToken);
    setToken(userToken);
  };

  const removeToken = () => {
    localStorage.removeItem("access_token");
    setToken(null);
  };

  return {
    setToken: saveToken,
    token,
    removeToken,
  };
}
