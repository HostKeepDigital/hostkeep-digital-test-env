import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function EmailVerificationStep({ email, onVerified, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await base44.functions.invoke("verifyEmailCode", { email, code });
    setLoading(false);
    if (res.data?.valid) {
      onVerified();
    } else {
      setError("Invalid or expired code. Please try again.");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    await base44.functions.invoke("sendVerificationCode", { email });
    setResending(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="text-center text-2xl tracking-widest"
          maxLength={6}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify Email"}
        </Button>
        <div className="flex justify-between text-sm text-gray-500">
          <button onClick={onBack} className="hover:underline">← Back</button>
          <button onClick={handleResend} disabled={resending} className="hover:underline text-teal-600">
            {resending ? "Resending..." : "Resend code"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}