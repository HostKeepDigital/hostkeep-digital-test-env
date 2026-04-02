import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/Looe%20Bridge.jpeg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function FoundingThankYou() {
  const [searchParams] = useSearchParams();
  const isOutOfArea = searchParams.get("status") === "out_of_area";

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
          <div className="flex items-center gap-3">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-60 w-60"
            />
          </div>

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

          <div className="flex gap-8">
            {[
              { value: "0%", label: "Commission" },
              { value: "£29", label: "From /month" },
              { value: "50", label: "Founding spots" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white text-2xl font-bold">{s.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm text-center">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-12 w-auto"
            />
          </div>

          {isOutOfArea ? (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-amber-500" />
              </div>

              <h2 className="text-2xl font-bold text-[#111827] mb-2">Thanks for your interest!</h2>
              <p className="text-sm text-gray-500 mb-6">We're not in your area just yet.</p>

              <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                HostKeep is currently launching in <strong>Cornwall and Devon</strong> (TR, PL and EX postcodes) during Summer 2026.
                <br /><br />
                We've registered your interest and <strong>you'll be one of the first to hear</strong> when we expand to your area. No need to do anything else — we'll be in touch.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8 text-left">
                <p className="text-xs text-amber-700">
                  📍 We're expanding across the UK throughout 2026 and 2027. Questions? Reach us at{" "}
                  <a href="mailto:hello@hostkeepdigital.co.uk" className="underline font-medium">
                    hello@hostkeepdigital.co.uk
                  </a>
                </p>
              </div>

              <Link to="/home">
                <Button className="w-full h-11 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl">
                  Back to Home
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-teal-600" />
              </div>

              <h2 className="text-2xl font-bold text-[#111827] mb-2">You're on the list!</h2>
              <p className="text-sm text-gray-500 mb-6">We'll be in touch within 24 hours.</p>

              <p className="text-gray-600 leading-relaxed mb-8 text-sm">
                We're reviewing your application now. You'll receive an email to let you know if
                you've made it into the beta or been added to our waitlist.
                <br /><br />
                You don't need to do anything else.
              </p>

              <Link to="/home">
                <Button className="w-full h-11 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl">
                  Back to Home
                </Button>
              </Link>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
