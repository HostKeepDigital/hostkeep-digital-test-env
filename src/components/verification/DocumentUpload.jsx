import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentUpload({ userId, documentType, label, description, onUploadComplete, userName, userEmail }) {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);

      // Create verification document record
      await base44.entities.VerificationDocuments.create({
        user_id: userId,
        document_type: documentType,
        file_url: file_url,
        verification_status: "pending"
      });

      toast.success("Document uploaded successfully");
      if (onUploadComplete) onUploadComplete(documentType, file_url);
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  // Notify admin
  try {
    const docLabel = documentType.replace(/_/g, " ");
    const displayName = userName || userEmail || userId;
    await base44.functions.invoke("sendEmail", {
      to: "admin@hostkeepdigital.co.uk",
      subject: `New verification document uploaded — ${displayName}`,
      html: `<p><strong>${displayName}</strong>${userEmail ? ` (${userEmail})` : ""} has uploaded a <strong>${docLabel}</strong> document for verification.</p><p><a href="https://hostkeepdigital.co.uk/admin">Review in Admin Panel →</a></p>`,
    });
  } catch (_) {}

  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      {description && <p className="text-sm text-gray-500 mb-3">{description}</p>}
      
      {fileUrl ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Document uploaded</p>
                <p className="text-xs text-green-700">Pending verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <label className="cursor-pointer">
          <Card className="border-dashed border-2 hover:border-blue-300 transition-colors">
            <CardContent className="p-6 text-center">
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              )}
              <p className="text-sm text-gray-600">
                {uploading ? "Uploading..." : "Click to upload"}
              </p>
            </CardContent>
          </Card>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}