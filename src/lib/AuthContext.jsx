import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [roles, setRoles] = useState([]);
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
        setRoles([]);
        setIsLoadingAuth(false);
        return;
      }

      const APP_ID = "698eee4108bd1d9467648326";
      const raw = await fetch(`/api/apps/${APP_ID}/functions/checkSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });
      const data = await raw.json();

      if (!data.authenticated) {
        localStorage.removeItem("session_token");
        localStorage.removeItem("session_expires_at");
        setIsAuthenticated(false);
        setUser(null);
        setRoles([]);
        setIsLoadingAuth(false);
        return;
      }

      setUser({
        id: data.user_id || null,
        email: data.email,
        role: data.role,
        founding_member_id: data.founding_member_id,
        signup_postcode: data.signup_postcode || null,
        forename: data.forename || null,
        middle_name: data.middle_name || null,
        surname: data.surname || null,
        phone: data.phone || null,
        location: data.location || null,
        is_founding_member: data.is_founding_member || false,
      });

      // Build roles array in the shape App.jsx expects
      setRoles([{
        role: data.role,
        approval_status: "approved",
      }]);

      setIsAuthenticated(true);
      setIsLoadingAuth(false);

    } catch (err) {
      console.error("validateSession error:", err);
      setIsAuthenticated(false);
      setUser(null);
      setRoles([]);
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("session_token");
    localStorage.removeItem("session_expires_at");
    setUser(null);
    setRoles([]);
    setIsAuthenticated(false);
    window.location.href = "/SignIn";
  };

  const updateUser = (fields) => {
    setUser((prev) => prev ? { ...prev, ...fields } : prev);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      roles,
      logout,
      validateSession,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);