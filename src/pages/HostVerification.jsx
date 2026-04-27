import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  FileText,
  Building2,
  CreditCard,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import DocumentUpload from "@/components/verification/DocumentUpload";
import PhoneVerification from "@/components/verification/PhoneVerification";
import { addUserRole } from "@/components/utils/roleHelpers";
import { useAuth } from "@/lib/AuthContext";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function HostVerification() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // ← custom auth

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [docFailedStatus, setDocFailedStatus] = useState(null);

  useEffect(() => {
    const checkDocFailStatus = async () => {
      if (!user?.id) return;
      try {
        const members = await base44.entities.FoundingMember.filter({ user_id: user.id });
        if (members.length > 0) {
          const status = members[0].approval_status;
          if (status === "documentation_failed_attempt_1" || status === "documentation_failed_attempt_2") {
            setDocFailedStatus(status);
          }
        }
      } catch (_) {}
    };
    checkDocFailStatus();
  }, [user?.id]);

  const [formData, setFormData] = useState({
    government_id: null,
    phone: "",
    phone_verified: false,
    property_address: "",
    bank_name: "",
    account_number: "",
    sort_code: ""
  });

  const handleDocumentUpload = async (type, url) => {
    setFormData((prev) => ({ ...prev, [type]: url }));
    
    // If re-uploading after failure, create new VerificationDocuments record
    if (docFailedStatus && type === "government_id") {
      try {
        await base44.entities.VerificationDocuments.create({
          user_id: user.id,
          document_type: "government_id",
          file_url: url,
          verification_status: "pending",
        });
        
        const members = await base44.entities.FoundingMember.filter({ user_id: user.id });
        if (members.length > 0) {
          await base44.entities.FoundingMember.update(members[0].id, { approval_status: "awaiting_document_verification" });
        }
        
        setDocFailedStatus(null);
        toast.success("New document submitted for review");
      } catch (e) {
        toast.error("Failed to submit document");
        console.error(e);
      }
    }
  };

  const handlePhoneVerified = (phone) => {
    setFormData((prev) => ({ ...prev, phone, phone_verified: true }));
  };

  const handleSubmit = async () => {
    if (!formData.government_id) {
      toast.error("Please upload your government ID");
      return;
    }
    if (!formData.phone_verified) {
      toast.error("Please verify your phone number");
      return;
    }

    setLoading(true);

    try {
      // Move FoundingMember to awaiting_document_verification
      const foundingMembers = await base44.entities.FoundingMember.filter({ user_id: user.id });
      if (foundingMembers.length === 0) {
        // fallback: try by id directly
        try { await base44.entities.FoundingMember.update(user.id, { approval_status: "awaiting_document_verification" }); } catch (_) {}
      } else {
        await base44.entities.FoundingMember.update(foundingMembers[0].id, { approval_status: "awaiting_document_verification" });
      }

      // Assign host role (pending approval)
      await addUserRole(user.id, "host");

      // Update role approval status
      const roles = await base44.entities.UserRole.filter({
        user_id: user.id,
        role: "host"
      });

      if (roles[0]) {
        await base44.entities.UserRole.update(roles[0].id, {
          approval_status: "pending"
        });
      }

      // Update user metadata (custom auth system)
      await base44.entities.User.update(user.id, {
        account_status: "pending_review",
        phone: formData.phone,
        phone_verified: true
      });

      toast.success(
        "Verification submitted! We'll review your application within 24–48 hours."
      );

      setTimeout(() => {
        navigate(createPageUrl("HostDashboard"));
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
          <Shield className="w-16 h-16 mx-auto mb-4 text-teal-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Host Verification
          </h1>
          <p className="text-gray-600">
            Complete your verification to start hosting
          </p>
        </div>

        <Progress value={progress} className="mb-8" />

        {docFailedStatus && (
          <div className="mb-6 p-4 rounded-lg border-l-4 border-amber-400 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800"><strong>Your previous verification document was not approved.</strong> Please upload a new document below.</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
           {/* Step 1: Identity Verification */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                    step >= 1 ? "bg-teal-600" : "bg-gray-300"
                  }`}
                >
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
                </span>
                Identity Verification
              </CardTitle>
              <CardDescription>
                Upload your government-issued ID
              </CardDescription>
            </CardHeader>

            <CardContent>
              <DocumentUpload
                userId={user?.id}
                documentType="government_id"
                label="Government ID"
                description="Passport, driver's license, or national ID card"
                userName={user?.full_name}
                userEmail={user?.email}
                onUploadComplete={handleDocumentUpload}
              />

              {formData.government_id && (
                <Button
                  onClick={() => setStep(2)}
                  className="mt-4 w-full"
                >
                  Continue to Phone Verification
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Phone Verification */}
          {step >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      step >= 2 ? "bg-teal-600" : "bg-gray-300"
                    }`}
                  >
                    {step > 2 ? <CheckCircle className="w-5 h-5" /> : "2"}
                  </span>
                  Phone Verification
                </CardTitle>
                <CardDescription>
                  Verify your phone number
                </CardDescription>
              </CardHeader>

              <CardContent>
                <PhoneVerification onVerified={handlePhoneVerified} />

                {formData.phone_verified && (
                  <Button
                    onClick={() => setStep(3)}
                    className="mt-4 w-full"
                  >
                    Continue to Property Details
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Property & Banking */}
          {step >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white">
                    3
                  </span>
                  Property & Banking Details
                </CardTitle>
                <CardDescription>
                  Your payout information (not activated until approval)
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label>Property Address</Label>
                  <Input
                    value={formData.property_address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        property_address: e.target.value
                      }))
                    }
                    placeholder="Property address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bank_name: e.target.value
                      }))
                    }
                    placeholder="Your bank name"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={formData.account_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          account_number: e.target.value
                        }))
                      }
                      placeholder="********"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Sort Code</Label>
                    <Input
                      value={formData.sort_code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sort_code: e.target.value
                        }))
                      }
                      placeholder="00-00-00"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700"
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
              <strong>What happens next?</strong> Our team will review your
              documents within 24–48 hours. You can create your listing now,
              but it won't be publicly visible until approved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}