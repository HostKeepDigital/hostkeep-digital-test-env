import { useState, useEffect } from "react";

export function useUser() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [foundingMemberId, setFoundingMemberId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("session_token");

    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    fetch("/functions/getUserFromSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsAuthenticated(true);
          setUser(data.user);
          setRole(data.role);
          setFoundingMemberId(data.founding_member_id);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { user, role, foundingMemberId, isAuthenticated, loading };
}