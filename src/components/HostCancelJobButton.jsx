import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function HostCancelJobButton({ cleaningJobId, hostId }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);

  async function handleCancel() {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke("hostCancelCleaningJob", {
        cleaningJobId,
      });
      setResult({ success: true });
      setTimeout(() => {
        setResult(null);
        setShowConfirm(false);
      }, 3000);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (result?.success) {
    return (
      <div className="p-2 bg-green-50 text-green-700 text-sm rounded">
        Job cancelled successfully.
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="p-2 bg-red-50 text-red-700 text-sm rounded">
        {result.error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleCancel}
        disabled={loading}
        className="w-full gap-2"
      >
        <X className="w-4 h-4" />
        {showConfirm ? "Confirm Cancel Job" : "Cancel Job"}
      </Button>
      {showConfirm && (
        <p className="text-xs text-gray-600">
          Cancelling will unassign the cleaner and mark the job as vacant.
        </p>
      )}
    </div>
  );
}