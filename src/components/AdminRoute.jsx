import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useUser } from "@/hooks/useUser";

export default function AdminRoute({ children }) {
  const { role, loading } = useUser();

  if (loading) return null;
  if (role !== "founding_member") return <Navigate to="/unauthorized" replace />;

  return <ProtectedRoute>{children}</ProtectedRoute>;
}