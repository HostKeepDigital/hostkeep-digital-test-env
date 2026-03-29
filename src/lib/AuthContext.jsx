import React, { createContext, useState, useContext, useEffect } from 'react';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const session_token = localStorage.getItem("session_token");
      if (!session_token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      const res = await fetch("/functions/checkSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });

      const data = await res.json();

      if (!data.valid) {
        localStorage.removeItem("session_token");
        localStorage.removeItem("session_expires_at");
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      setUser({
        email: data.email,
        role: data.role,
        founding_member_id: data.founding_member_id,
      });

      setIsAuthenticated(true);
      setIsLoadingAuth(false);

    } catch (err) {
      console.error("validateSession error:", err);
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("session_token");
    localStorage.removeItem("session_expires_at");
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/Home";
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout,
      validateSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);