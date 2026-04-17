import { useSearchParams, useNavigate } from "react-router-dom";
import EmailVerificationStep from "@/components/founding/EmailVerificationStep";

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/vecteezy_cornwall-coast-in-england_2524414.jpg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const isGuest = role === "guest";

  if (!email) {
    navigate(isGuest ? "/GuestSignUp" : "/founding");
    return null;
  }

  const handleVerified = () => {
    if (isGuest) {
      navigate("/");
    } else {
      navigate(status ? `/founding-thankyou?status=${status}` : "/founding-thankyou");
    }
  };

  const leftPanel = isGuest ? (
    <div>
      <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
        Discover · Holiday Homes · Better Value
      </p>
      <h1 className="text-white text-4xl font-bold leading-tight mb-6">
        One step away<br />from your next<br />
        <span className="text-[#0d9488]">perfect stay.</span>
      </h1>
      <p className="text-white/70 text-base leading-relaxed max-w-sm">
        HostKeep properties offer 0% commission markups — meaning lower prices than traditional booking platforms.
      </p>
    </div>
  ) : (
    <div>
      <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
        Cornwall · Summer 2026
      </p>
      <h1 className="text-white text-4xl font-bold leading-tight mb-6">
        Your property.<br />Your price.<br />
        <span className="text-[#0d9488]">Zero commission.</span>
      </h1>
      <p className="text-white/70 text-base leading-relaxed max-w-sm">
        HostKeep gives Cornwall hosts everything Airbnb offers at a flat monthly rate — not a cut of every booking.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={CORNWALL_IMG} alt="Cornwall coast" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <img src={LOGO_IMG} alt="HostKeep Digital" className="h-60 w-60" />
          {leftPanel}
          {!isGuest && (
            <div className="flex gap-8">
              {[{ value: "0%", label: "Commission" }, { value: "£29", label: "From /month" }, { value: "50", label: "Founding spots" }].map((s) => (
                <div key={s.label}>
                  <p className="text-white text-2xl font-bold">{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={LOGO_IMG} alt="HostKeep Digital" className="h-60 w-60" />
          </div>
          <EmailVerificationStep
            email={email}
            onVerified={handleVerified}
            onBack={() => navigate(isGuest ? "/GuestSignUp" : "/founding")}
            isGuest={isGuest}
          />
        </div>
      </div>
    </div>
  );
}