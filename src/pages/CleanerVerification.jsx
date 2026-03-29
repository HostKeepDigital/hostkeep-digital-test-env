import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import DocumentUpload from "@/components/verification/DocumentUpload";
import PhoneVerification from "@/components/verification/PhoneVerification";
import { addUserRole } from "@/components/utils/roleHelpers";
import { useAuth } from "@/lib/AuthContext";

export default function CleanerVerification() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();   // ✅ custom auth

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    government_id: null,
    selfie: null,
    phone: "",
    phone_verified: false,
    service_area: ""
  });

  // Handle document uploads
  const handleDocumentUpload = (type, url) => {
    setFormData(prev => ({ ...prev, [type]: url }));
  };

  // Handle phone verification
  const handlePhoneVerified = (phone) => {
    setFormData(prev => ({ ...prev, phone, phone_verified: true }));
  };

  const handleSubmit = async () => {
    if (!formData.government_id || !formData.selfie) {
      toast.error("Please upload all required documents");
      return;
    }
    if (!formData.phone_verified) {
      toast.error("Please verify your phone number");
      return;
    }

    setLoading(true);

    try {
      // Assign cleaner role (pending approval)
      await addUserRole(user.id, "cleaner");

      // Update UserRole approval status
      const roles = await base44.entities.UserRole.filter({
        user_id: user.id,
        role: "cleaner"
      });

      if (roles[0]) {
        await base44.entities.UserRole.update(roles[0].id, {
          approval_status: "pending"
        });
      }

      // Update user metadata (custom auth system)
      // You may need to adjust this depending on your backend
      await base44.entities.User.update(user.id, {
        account_status: "pending_review",
        phone: formData.phone,
        phone_verified: true
      });

      toast.success("Verification submitted! We'll review your application within 24–48 hours.");

      setTimeout(() => {
        navigate(createPageUrl("CleanerDashboard"));
      }, 2000);

    } catch (error) {
      toast.error("Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cleaner Verification</h1>
          <p className="text-gray-600">Complete your verification to start accepting jobs</p>
        </div>

        <Progress value={progress} className="mb-8" />

        <div className="space-y-6">

          {/* STEP 1 — ID Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 1 ? "bg-blue-600" : "bg-gray-300"}`}>
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
                </span>
                Identity Verification
              </CardTitle>
              <CardDescription>Upload your government-issued ID and selfie</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <DocumentUpload
                userId={user?.id}
                documentType="government_id"
                label="Government ID"
                description="Passport, driver's license, or national ID card"
                onUploadComplete={handleDocumentUpload}
              />

              <DocumentUpload
                userId={user?.id}
                documentType="selfie"
                label="Selfie"
                description="Clear photo of your face"
                onUploadComplete={handleDocumentUpload}
              />

              {formData.government_id && formData.selfie && (
                <Button onClick={() => setStep(2)} className="w-full">
                  Continue to Phone Verification
                </Button>
              )}
            </CardContent>
          </Card>

          {/* STEP 2 — Phone Verification */}
          {step >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 2 ? "bg-blue-600" : "bg-gray-300"}`}>
                    {step > 3 ? <CheckCircle className="w-5 h-5" /> : "2"}
                  </span>
                  Phone Verification
                </CardTitle>
                <CardDescription>Verify your phone number</CardDescription>
              </CardHeader>

              <CardContent>
                <PhoneVerification onVerified={handlePhoneVerified} />

                {formData.phone_verified && (
                  <Button onClick={() => setStep(3)} className="mt-4 w-full">
                    Continue to Service Area
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 3 — Service Area */}
          {step >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    3
                  </span>
                  Service Area
                </CardTitle>
                <CardDescription>Where do you provide cleaning services?</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label>Service Area</Label>
                  <Input
                    value={formData.service_area}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, service_area: e.target.value }))
                    }
                    placeholder="City or region"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Submitting..." : "Submit for Verification"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next?</strong> Our team will review your documents within 24–48 hours.
              You can set up your profile now, but you won't be able to accept jobs until approved.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}