import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PhoneVerification({ onVerified }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!phone) {
      toast.error("Please enter a phone number");
      return;
    }
    
    setLoading(true);
    // Simulate sending code
    setTimeout(() => {
      setCodeSent(true);
      setLoading(false);
      toast.success("Verification code sent");
    }, 1000);
  };

  const verifyCode = async () => {
    if (!code) {
      toast.error("Please enter the verification code");
      return;
    }

    setLoading(true);
    // Simulate verification (in production, this would call a backend)
    setTimeout(() => {
      setVerified(true);
      setLoading(false);
      toast.success("Phone verified successfully");
      if (onVerified) onVerified(phone);
    }, 1000);
  };

  if (verified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Phone verified</p>
              <p className="text-xs text-green-700">{phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Phone Number</Label>
      <div className="flex gap-2">
        <Input
          type="tel"
          placeholder="+44 7700 900000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={codeSent}
          className="flex-1"
        />
        {!codeSent && (
          <Button onClick={sendCode} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
          </Button>
        )}
      </div>

      {codeSent && !verified && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            className="flex-1"
          />
          <Button onClick={verifyCode} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
      )}
    </div>
  );
}