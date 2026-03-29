import { Navigate } from "react-router-dom";
import { useUser } from "../hooks/useUser";

export default function ProtectedRoute({ children }) {
  const { user, role, loading } = useUser();

  // Still checking session → show nothing or a loader
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  // No user → redirect to signin
  if (!user || !role) {
    return <Navigate to="/signin" replace />;
  }

  // User authenticated → render page
  return children;
}