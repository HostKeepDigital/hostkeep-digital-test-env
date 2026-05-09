import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck } from "lucide-react";

export default function PolicyPickerDialog({
  open,
  onOpenChange,
  policies = [],
  value,
  onChange,
  title = "Select Cancellation Policy",
  description,
  confirmLabel = "Confirm",
  showNote = false,
}) {
  const [selected, setSelected] = useState(value || "");
  const isUnchanged = selected === (value || "");

  // Sync when dialog opens
  const handleOpen = (isOpen) => {
    if (isOpen) setSelected(value || "");
    onOpenChange(isOpen);
  };

  const handleConfirm = () => {
    onChange(selected);
    onOpenChange(false);
  };

  const noChangeSelected = selected && isUnchanged;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {[...policies].sort((a, b) => {
            const order = ["Flexible", "Moderate", "Strict", "Super Strict"];
            return (order.indexOf(a.policy_name) ?? 99) - (order.indexOf(b.policy_name) ?? 99);
          }).map((policy) => {
            const isSelected = selected === policy.id;
            return (
              <button
                key={policy.id}
                onClick={() => setSelected(policy.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  isSelected
                    ? "border-teal-500 bg-teal-50"
                    : policy.id === (value || "")
                    ? "border-teal-200 bg-teal-50/40 hover:border-teal-300"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-teal-500 bg-teal-500" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-teal-600" : "text-gray-400"}`} />
                    <p className={`font-semibold text-sm ${isSelected ? "text-teal-700" : "text-gray-900"}`}>
                    {policy.policy_name}
                    </p>
                    {policy.policy_name === "Super Strict" && (
                      <span className="text-xs text-rose-600 font-medium">⚠️ May reduce bookings</span>
                    )}
                    {policy.id === (value || "") && (
                      <span className="text-xs text-teal-600 font-medium bg-teal-100 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                  {policy.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {policy.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {policies.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No policies available.</p>
          )}
        </div>

        {noChangeSelected && (
          <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-700">
              You've selected your current policy. No changes will be made.
            </p>
          </div>
        )}

        {showNote && (
          <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Existing bookings keep the policy they were made under. Only new bookings going forward will use this policy.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className={noChangeSelected ? "" : "bg-teal-600 hover:bg-teal-700"}
            variant={noChangeSelected ? "outline" : "default"}
            onClick={handleConfirm}
            disabled={!selected}
          >
            {noChangeSelected ? "No Changes" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}