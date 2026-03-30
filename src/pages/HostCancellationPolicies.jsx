import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function HostCancellationPolicies() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ["host-properties-policies", user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["cancellation-policies"],
    queryFn: () => base44.entities.CancellationPolicy.list(),
  });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    property: null,
    data: null,
  });

  const updateMutation = useMutation({
    mutationFn: ({ propertyId, data }) =>
      base44.entities.Property.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["host-properties-policies"],
      });
      toast.success("Cancellation policy updated successfully.");
      setConfirmModal({ open: false, property: null, data: null });
    },
    onError: () => toast.error("Failed to update policy"),
  });

  const handleSave = (property, data) => {
    setConfirmModal({ open: true, property, data });
  };

  const confirmSave = () => {
    if (confirmModal.property && confirmModal.data) {
      updateMutation.mutate({
        propertyId: confirmModal.property.id,
        data: confirmModal.data,
      });
    }
  };

  if (propsLoading || policiesLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-teal-600" />
          Cancellation Policies
        </h1>
        <p className="text-gray-500 mt-2">
          Manage cancellation policies for your properties.
        </p>
        <div className="mt-4 p-4 bg-amber-50 rounded-lg text-amber-800 text-sm">
          <strong>Note:</strong> Changes to cancellation policy will not affect
          existing bookings.
        </div>
      </div>

      <div className="space-y-6">
        {properties.map((property) => (
          <PolicyCard
            key={property.id}
            property={property}
            policies={policies}
            onSave={(data) => handleSave(property, data)}
            isUpdating={
              updateMutation.isPending &&
              confirmModal.property?.id === property.id
            }
          />
        ))}

        {properties.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">You don't have any properties yet.</p>
          </div>
        )}
      </div>

      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmModal({ open: false, property: null, data: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Policy Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change your cancellation policy? This
              will apply to future bookings only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmModal({ open: false, property: null, data: null })
              }
            >
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={confirmSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyCard({ property, policies, onSave, isUpdating }) {
  const [selectedPolicy, setSelectedPolicy] = useState(
    property.cancellation_policy_id || ""
  );
  const [refundCleaning, setRefundCleaning] = useState(
    property.cleaning_fee_refundable !== false
  );

  const hasChanges =
    selectedPolicy !== property.cancellation_policy_id ||
    refundCleaning !== (property.cleaning_fee_refundable !== false);

  const policy = policies.find((p) => p.id === selectedPolicy);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Label>Cancellation Policy</Label>

          <Select
            value={selectedPolicy}
            onValueChange={(val) => {
              setSelectedPolicy(val);
              const isStrict = policies
                .find((p) => p.id === val)
                ?.policy_name?.includes("Strict");
              setRefundCleaning(!isStrict);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a policy..." />
            </SelectTrigger>

            <SelectContent>
              {policies.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.policy_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {policy && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
              {policy.description}
            </div>
          )}

          {policy?.policy_name === "Super Strict" && (
            <div className="mt-2 text-sm text-rose-600 font-medium">
              Warning: This policy may reduce booking conversions.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={refundCleaning}
            onCheckedChange={setRefundCleaning}
            id={`clean-${property.id}`}
          />
          <Label
            htmlFor={`clean-${property.id}`}
            className="font-normal cursor-pointer"
          >
            Refund cleaning fee if guest cancels before check-in
          </Label>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button
              onClick={() =>
                onSave({
                  cancellation_policy_id: selectedPolicy,
                  cleaning_fee_refundable: refundCleaning,
                })
              }
              disabled={isUpdating}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}