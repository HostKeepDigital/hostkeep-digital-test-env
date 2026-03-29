import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "authenticated" | "unauthenticated"
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("session_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    fetch("/functions/checkSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        setStatus("unauthenticated");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signin?next=${next}`} replace />;
  }

  return children;
}