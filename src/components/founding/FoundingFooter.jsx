import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CORNWALL_IMG = "https://drive.google.com/uc?export=view&id=1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function FoundingThankYou() {
  return (
    <div className="min-h-screen flex">

      {/* Left panel — Cornwall photography */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CORNWALL_IMG}
          alt="Cornwall coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-60 w-60"
            />
          </div>

          {/* Centre quote */}
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

      {/* Right panel — thank you content */}
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-teal-600" />
            </div>

            <h2 className="text-2xl font-bold text-[#111827] mb-2">You're on the list!</h2>
            <p className="text-sm text-gray-500 mb-6">We'll be in touch within 24 hours.</p>

            <p className="text-gray-500 leading-relaxed text-sm mb-8">
              We're reviewing your application now. You'll receive an email to let you know if you've
              made it into the beta or been added to our waitlist.
              <br /><br />
              You don't need to do anything else.
            </p>

            <Link to="/home">
              <Button className="w-full h-12 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl transition-colors">
                Back to Home
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>

    </div>
  );
}