import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { logout } from "../utils/logout";

export function useUser() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const expiresAt = localStorage.getItem("session_expires_at");
        if (expiresAt && new Date(expiresAt) < new Date()) {
          logout();
          return;
        }

        const data = await api("/functions/checkSession", {});
        if (!data || !data.authenticated) {
          setUser(null);
          setRole(null);
          return;
        }

        setUser({
          email: data.email,
          founding_member_id: data.founding_member_id || null,
        });
        setRole(data.role || null);
      } catch (err) {
        console.error("useUser error:", err);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, role, loading };
}