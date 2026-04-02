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
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-3 max-w-sm">
        📬 Can't find the email? Please check your <strong>junk or spam folder</strong>.
      </p>
    </div>
  
  );
}