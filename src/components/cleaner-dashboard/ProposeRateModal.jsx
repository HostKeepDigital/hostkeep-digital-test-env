import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProposeRateModal({ job, cleanerId, onClose }) {
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseFloat(rate);
    if (!parsed || parsed <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    setSaving(true);
    // Find existing PropertyCleanerSettings for this cleaner + property
    const existing = await base44.entities.PropertyCleanerSettings.filter({
      property_id: job.property_id,
      default_cleaner_id: cleanerId,
    });

    if (existing.length > 0) {
      await base44.entities.PropertyCleanerSettings.update(existing[0].id, {
        counter_rate: parsed,
        counter_rate_status: "pending",
      });
    } else {
      await base44.entities.PropertyCleanerSettings.create({
        property_id: job.property_id,
        host_id: job.host_id,
        default_cleaner_id: cleanerId,
        counter_rate: parsed,
        counter_rate_status: "pending",
      });
    }

    toast.success("Rate proposal sent to host.");
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Propose a different rate</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-gray-500 mb-4">
            Suggest a fixed rate for{" "}
            <span className="font-medium text-gray-700">
              {job.property_details?.address || "this property"}
            </span>
            . The host will be notified to review it.
          </p>
          <Label htmlFor="counter_rate">Your proposed rate (£)</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500">£</span>
            <Input
              id="counter_rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 90.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Sending…" : "Send Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}