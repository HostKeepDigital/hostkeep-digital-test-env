import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreVertical,
  Edit,
  Eye,
  Pause,
  Play,
  Trash2,
  MapPin,
  Users,
  Bed,
  Star,
  Home,
  Crown,
  X,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import PropertyListingCard from "@/components/properties/PropertyListingCard";
import { useAuth } from "@/lib/AuthContext";

export default function HostProperties() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const [deleteProperty, setDeleteProperty] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["host-properties", user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: cleanerSettings = [] } = useQuery({
    queryKey: ["cleaner-settings", user?.id],
    queryFn: () =>
      base44.entities.PropertyCleanerSettings.filter({ host_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ["upcoming-bookings", user?.id],
    queryFn: () =>
      base44.entities.Booking.filter({
        host_id: user?.id,
        booking_status: "confirmed"
      }),
    enabled: !!user?.id
  });

  const { data: cleaningJobs = [] } = useQuery({
    queryKey: ["cleaning-jobs", user?.id],
    queryFn: () => base44.entities.CleaningJob.filter({ host_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({
        user_id: user?.id
      });
      return subs[0];
    },
    enabled: !!user?.id
  });

  const { data: foundingMemberData } = useQuery({
    queryKey: ["founding-member", user?.email],
    queryFn: async () => {
      const members = await base44.entities.FoundingMember.filter({ email: user.email });
      return members?.[0] || null;
    },
    enabled: !!user?.email
  });

  const isFoundingMember = foundingMemberData?.is_founding_member === true;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-properties"] });
      toast.success("Property updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-properties"] });
      setDeleteProperty(null);
      toast.success("Property deleted");
    }
  });

  const handleAddPropertyClick = (e) => {
    if (
      subscription?.plan === "basic" &&
      subscription?.max_properties === 1 &&
      properties.length >= 1
    ) {
      e.preventDefault();
      setShowUpgradeDialog(true);
    } else {
      window.location.href = createPageUrl("CreateProperty");
    }
  };

  const toggleStatus = (property) => {
    const newStatus =
      property.status === "published" ? "paused" : "published";
    updateMutation.mutate({
      id: property.id,
      data: { status: newStatus }
    });
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Your Properties
            </h1>
            <p className="text-gray-500">{properties.length} properties listed</p>
          </div>

          <Button
            onClick={handleAddPropertyClick}
            className="bg-teal-600 hover:bg-teal-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </Button>
        </div>

        {!user || isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        ) : properties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
              <Home className="w-10 h-10 text-teal-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No properties yet
            </h3>

            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start your hosting journey by adding your first property. It only
              takes a few minutes to get setup.
            </p>

            <Link to={createPageUrl("CreateProperty")}>
              <Button className="bg-teal-600 hover:bg-teal-700 h-12 px-8 text-base rounded-xl">
                Add Your First Property
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <div
              className={
                properties.length === 1
                  ? "flex justify-center"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              }
            >
              {properties.map((property, idx) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={
                    properties.length === 1 ? "w-full flex justify-center" : ""
                  }
                >
                  <PropertyListingCard
                    property={property}
                    cleanerSettings={cleanerSettings.find(
                      (cs) => cs.property_id === property.id
                    )}
                    upcomingBookings={upcomingBookings}
                    cleaningJobs={cleaningJobs}
                    isSingle={properties.length === 1}
                    onStatusToggle={() => toggleStatus(property)}
                    onDelete={() => setDeleteProperty(property)}
                    isFoundingMember={isFoundingMember}
                  />
                </motion.div>
              ))}
            </div>

            {properties.length === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-16 pt-10 border-t border-gray-200 text-center"
              >
                <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-gray-50/80 border border-gray-100">
                  <PlusCircle className="w-10 h-10 text-teal-600 mb-4 opacity-80" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Thinking of expanding?
                  </h4>
                  <p className="text-gray-500 mb-6 text-sm max-w-sm">
                    Grow your hosting business by adding another property to your
                    portfolio.
                  </p>

                  <Button
                    onClick={handleAddPropertyClick}
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 rounded-xl"
                  >
                    Add Another Listing
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog
          open={!!deleteProperty}
          onOpenChange={() => setDeleteProperty(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteProperty?.title}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>

              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteProperty.id)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade Dialog */}
        <AlertDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
        >
          <AlertDialogContent>
            <button
              onClick={() => setShowUpgradeDialog(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-violet-600" />
                Upgrade Required
              </AlertDialogTitle>

              <AlertDialogDescription className="text-left space-y-2">
                <p>
                  If you want to add more than one property, please see subscription
                  upgrades.
                </p>

                <p className="text-sm text-gray-600">
                  Upgrade to <strong>Pro</strong> (up to 5 properties) or{" "}
                  <strong>Premium</strong> (unlimited properties).
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() =>
                  (window.location.href = createPageUrl("Subscription"))
                }
                className="bg-violet-600 hover:bg-violet-700"
              >
                View Subscription Plans
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
