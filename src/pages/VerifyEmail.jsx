import { useSearchParams, useNavigate } from "react-router-dom";
import EmailVerificationStep from "@/components/founding/EmailVerificationStep";

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/vecteezy_coastal-path-sign-post-near-bude_6966039.jpg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

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