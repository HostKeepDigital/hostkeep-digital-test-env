import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useUser } from "@/hooks/useUser";

export default function HostRoute({ children }) {
  const { role, loading } = useUser();

  if (loading) return null;
  if (role !== "host") return <Navigate to="/unauthorized" replace />;

  return <ProtectedRoute>{children}</ProtectedRoute>;
}