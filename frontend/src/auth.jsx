import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";

const AuthContext = createContext(null);

const TOKEN_KEY = "buseasy-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    apiRequest("/auth/me", { token })
      .then((data) => {
        if (isMounted) {
          setUser(data);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      login,
      logout,
    }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
