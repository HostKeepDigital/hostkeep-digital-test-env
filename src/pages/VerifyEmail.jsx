import { useSearchParams, useNavigate } from "react-router-dom";
import EmailVerificationStep from "@/components/founding/EmailVerificationStep";

const CORNWALL_IMG = "https://drive.google.com/uc?export=view&id=1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");
  const status = searchParams.get("status");

  if (!email) {
    navigate("/founding");
    return null;
  }

  const handleVerified = () => {
    navigate(status ? `/founding-thankyou?status=${status}` : "/founding-thankyou");
  };

  return (
    <div className="min-h-screen flex">

      {/* Left panel — Cornwall photography */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CORNWALL_IMG}
          alt="Cornwall coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <img
            src={LOGO_IMG}
            alt="HostKeep Digital"
            className="h-12 w-auto"
          />

          <div>
            <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
              Cornwall · Summer 2026
            </p>
            <h1 className="text-white text-4xl font-bold leading-tight mb-6">
              Your property.<br />
              Your price.<br />
              <span className="text-[#0d9488]">Zero commission.</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              HostKeep gives Cornwall hosts everything Airbnb offers at a flat monthly rate — not a cut of every booking.
            </p>
          </div>

        </div>
      </div>

      {/* Right panel — verification */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-12 w-auto"
            />
          </div>

          <EmailVerificationStep
            email={email}
            onVerified={handleVerified}
            onBack={() => navigate("/founding")}
          />

        </div>
      </div>

    </div>
  );
}