import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useUser } from "../hooks/useUser";

export default function CleanerRoute({ children }) {
  const { role, loading } = useUser();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (role !== "cleaner") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}