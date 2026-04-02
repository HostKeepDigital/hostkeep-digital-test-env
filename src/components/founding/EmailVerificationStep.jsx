import { useSearchParams, useNavigate } from "react-router-dom";
import EmailVerificationStep from "@/components/founding/EmailVerificationStep";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");

  if (!email) {
    navigate("/founding");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <EmailVerificationStep
        email={email}
        onVerified={() => navigate("/founding-thankyou")}
        onBack={() => navigate("/founding")}
      />
    </div>
  );
}