import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, AlertCircle, RefreshCw } from "lucide-react";

export default function EmailVerificationStep({ email, onVerified, onBack, message, initialShowResend = false }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(initialShowResend ? 0 : 60);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    setError("");
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setVerifying(true);
    setError("");
    const res = await base44.functions.invoke("verifyEmailCode", { email, code });
    const data = res.data;
    setVerifying(false);
    if (data?.valid) {
      onVerified();
    } else {
      setError("Incorrect or expired code. Please try again or request a new code.");
      setCode("");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setCode("");
    await base44.functions.invoke("sendVerificationCode", { email });
    setResending(false);
    setResendCooldown(60);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleVerify();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-8"
    >
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-4">
          <Mail className="w-7 h-7 text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Almost there!</h2>
        <p className="text-gray-600 max-w-sm">
          We have sent a 6-digit verification code to{" "}
          <span className="font-semibold text-gray-900">{email}</span>. Please enter it below to complete your application. The code expires in 10 minutes.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            ref={inputRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className={`text-center text-3xl font-bold tracking-widest h-16 ${error ? "border-red-400" : ""}`}
          />
          {error && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || code.length !== 6}
          className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-base font-semibold"
        >
          {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify & Complete Application"}
        </Button>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to form
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
            ) : resendCooldown > 0 ? (
              `Resend code in ${resendCooldown}s`
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /> Resend code</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}