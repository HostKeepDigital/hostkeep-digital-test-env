import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";

// ForgotPassword is handled inside ResetPassword (no-token state)
export default function ForgotPassword() {
  return <Navigate to="/ResetPassword" replace />;
}