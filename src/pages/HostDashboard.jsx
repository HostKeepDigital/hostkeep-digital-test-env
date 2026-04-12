import { useState, useEffect } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import StripeStatusBanner from "@/components/host/StripeStatusBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  PoundSterling,
  Calendar,
  MessageSquare,
  Settings,
  Plus,
  TrendingUp,
  Users,
  Star,
  Eye,
  ArrowRight,
  Bell,
  Crown,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StatsCard from "@/components/dashboard/StatsCard";
import {
  parseISO,
  isAfter,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
} from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PolicyPickerDialog from "@/components/properties/PolicyPickerDialog";
import NewMessageModal from "@/components/messaging/NewMessageModal";
import { useAuth } from "@/lib/AuthContext";

// NEW: hybrid booking + cleaning calendar
import BookingBarCalendar from "@/components/BookingBarCalendar";

export default function HostDashboard() {
  const { user } = useAuth();
  const { refreshing } = usePullToRefresh([
    ["host-properties", user?.id],
    ["host-bookings", user?.id],
    ["host-messages", user?.id],
    ["subscription", user?.id],
  ]);
  const queryClient = useQueryClient();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [policyDraft, setPolicyDraft] = useState("");
  const [policySaved, setPolicySaved] = useState(false);

  // Selected property for calendar
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Load properties
  const { data: properties = [] } = useQuery({
    queryKey: ["host-properties", user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  // Load bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ["host-bookings", user?.id],
    queryFn: () => base44.entities.Booking.filter({ host_id: user?.id }),
    enabled: !!user?.id,
  });

  // Load unread messages
  const { data: messages = [] } = useQuery({
    queryKey: ["host-messages", user?.id],
    queryFn: () =>
      base44.entities.Message.filter({
        receiver_id: user?.id,
        read: false,
      }),
    enabled: !!user?.id,
  });

  // Load subscription
  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({
        user_id: user?.id,
      });
      return subs[0];
    },
    enabled: !!user?.id,
  });

  // Load cancellation policies
  const { data: cancellationPolicies = [] } = useQuery({
    queryKey: ["cancellation-policies"],
    queryFn: () => base44.entities.CancellationPolicy.list(),
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const pendingBookings = bookings.filter(
    (b) => b.booking_status === "pending"
  );

  const confirmedBookings = bookings.filter(
    (b) =>
      b.booking_status === "confirmed" &&
      isAfter(parseISO(b.check_in), today)
  );

  const monthlyEarnings = bookings
    .filter(
      (b) =>
        b.booking_status !== "cancelled" &&
        b.payment_status === "paid"
    )
    .filter((b) =>
      isWithinInterval(parseISO(b.check_in), {
        start: monthStart,
        end: monthEnd,
      })
    )
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const totalEarnings = bookings
    .filter(
      (b) =>
        b.booking_status !== "cancelled" &&
        b.payment_status === "paid"
    )
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const publishedProperties = properties.filter(
    (p) => p.status === "published"
  ).length;

  // Detect properties with invalid booking rules
  const propertiesWithDeadDays = properties
    .map((p) => {
      if (!p.day_based_restrictions_enabled || !p.booking_rules) return null;

      const deadDays = Object.entries(p.booking_rules)
        .filter(([_, rule]) => {
          if (!rule.enabled) return false;

          const type = rule.rule_type || "any";
          const hasFixed =
            rule.fixed_values &&
            Array.isArray(rule.fixed_values) &&
            rule.fixed_values.length > 0;

          const hasMultiples =
            rule.multiple_of &&
            (Array.isArray(rule.multiple_of)
              ? rule.multiple_of.some((m) => m > 0)
              : rule.multiple_of > 0);

          if (type === "fixed") return !hasFixed;
          if (type === "multiples") return !hasMultiples;
          if (type === "fixed_or_multiples") return !(hasFixed || hasMultiples);

          return false;
        })
        .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1));

      if (deadDays.length > 0) return { title: p.title, id: p.id, deadDays };

      return null;
    })
    .filter(Boolean);

  const savePolicyMutation = useMutation({
    mutationFn: ({ propertyId, policyId }) =>
      base44.entities.Property.update(propertyId, { cancellation_policy_id: policyId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries(["host-properties", user?.id]);
      setShowPolicyDialog(false);
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    },
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

  // Default selected property when properties load
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-2 pt-20">
          <div className="bg-white rounded-full shadow px-4 py-1.5 text-xs text-teal-600 font-medium flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Refreshing…
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 py-3 md:px-6 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-gray-500">Manage your properties and bookings</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pendingBookings.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Bell className="w-3 h-3 mr-1" />
                {pendingBookings.length}
              </Badge>
            )}
            <Button onClick={handleAddPropertyClick} className="bg-teal-600 hover:bg-teal-700 gap-1.5 text-sm h-9 px-3">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Property</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Stripe Status Banner */}
        <StripeStatusBanner user={user} />

        {/* Config Warnings */}
        {propertiesWithDeadDays.length > 0 && (
          <div className="mb-8 space-y-4">
            {propertiesWithDeadDays.map((item) => (
              <Alert
                key={item.id}
                variant="destructive"
                className="bg-red-50 border-red-200 text-red-800"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-900">
                  Configuration Error: {item.title}
                </AlertTitle>
                <AlertDescription className="text-red-800">
                  The following days are enabled for check-in but have no valid
                  duration settings:
                  <span className="font-semibold">
                    {" "}
                    {item.deadDays.join(", ")}
                  </span>
                  . These days will be unbookable.
                  <Link
                    to={createPageUrl("EditProperty") + `?id=${item.id}`}
                    className="underline ml-2"
                  >
                    Fix now
                  </Link>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Subscription Banner */}
        {(!subscription || subscription.status === "trial") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-4 text-white mb-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {subscription ? "Your trial ends soon" : "Start your hosting journey"}
                </h3>
                <p className="text-xs text-teal-100">Subscribe to list properties and start earning</p>
              </div>
              <Link to={createPageUrl("Subscription")} className="flex-shrink-0">
                <Button size="sm" className="bg-white text-teal-700 hover:bg-teal-50 h-8 text-xs">View Plans</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatsCard title="This Month" value={`£${monthlyEarnings.toFixed(0)}`} icon={PoundSterling} color="emerald" />
          <StatsCard title="Total Earnings" value={`£${totalEarnings.toFixed(0)}`} icon={TrendingUp} color="teal" />
          <StatsCard title="Properties" value={publishedProperties} subtitle={`${properties.length} total`} icon={Home} color="violet" />
          <StatsCard title="Upcoming" value={confirmedBookings.length} subtitle="bookings" icon={Calendar} color="amber" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-4">
            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Pending Requests ({pendingBookings.length})
                </h2>
                <div className="space-y-2">
                  {pendingBookings.slice(0, 3).map((booking) => (
                    <Link
                      key={booking.id}
                      to={createPageUrl("HostBookings") + `?id=${booking.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(booking.check_in), "MMM d")} – {format(parseISO(booking.check_out), "MMM d")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">£{booking.total_amount}</p>
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to={createPageUrl("HostBookings")} className="text-teal-600 text-sm font-medium flex items-center gap-1 mt-3">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            )}

            {/* Properties */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Your Properties</h2>
                <Link to={createPageUrl("HostProperties")} className="text-teal-600 text-sm font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {properties.length === 0 ? (
                <div className="text-center py-6">
                  <Home className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 text-sm mb-3">No properties yet</p>
                  <Link to={createPageUrl("CreateProperty")}>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">Add Your First Property</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {properties.slice(0, 3).map((property) => (
                    <Link
                      key={property.id}
                      to={createPageUrl("HostProperties")}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <img
                        src={property.photos?.[0] || "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a"}
                        alt={property.title}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-base">{property.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">£{property.nightly_rate}/night</p>
                        <p className="text-xs text-gray-400 mt-0.5">{property.town || property.postcode_area || ""}</p>
                      </div>
                      <Badge variant={property.status === "published" ? "default" : "secondary"} className="text-sm px-2 py-1">
                        {property.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Hybrid Calendar: Bookings + Cleaning */}
            {properties.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-base font-semibold text-gray-900">Calendar</h2>
                  <select
                    className="border rounded px-2 py-1 text-xs flex-shrink-0 max-w-[180px] truncate"
                    value={selectedPropertyId || ""}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                {selectedPropertyId ? (
                  <BookingBarCalendar propertyId={selectedPropertyId} />
                ) : (
                  <p className="text-sm text-gray-500">Select a property to view its calendar.</p>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Cancellation Policies */}
            {properties.length > 0 && (() => {
              const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
              const policy = selectedProperty ? cancellationPolicies.find((p) => p.id === selectedProperty.cancellation_policy_id) : null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Cancellation Policy</h3>
                  {selectedProperty ? (
                    <div className="space-y-3">
                      {policy ? (
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
                          <p className="text-xs font-semibold text-teal-700">{policy.policy_name}</p>
                          {policy.description && (
                            <p className="text-xs text-gray-600 leading-relaxed">{policy.description}</p>
                          )}
                          {policy.policy_name === "Super Strict" && (
                            <p className="text-xs text-rose-600">⚠️ May reduce conversions</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-xs text-gray-400 italic">No policy assigned</p>
                        </div>
                      )}
                      {policySaved && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Policy updated — applies to new bookings only
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          setPolicyDraft(selectedProperty.cancellation_policy_id || "");
                          setShowPolicyDialog(true);
                        }}
                      >
                        Change Cancellation Policy
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Select a property to view its policy</p>
                  )}
                </motion.div>
              );
            })()}

            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Subscription</h3>

              {subscription ? (() => {
                const isBeta = ["beta_host_access", "beta_cleaner_access"].includes(subscription.plan);
                const FOUNDING_PLANS = {
                  founding_host_solo:      { name: "Solo Host Founding",      price: 19, max: 1 },
                  founding_host_multi:     { name: "Multi Host Founding",     price: 49, max: 5 },
                  founding_host_portfolio: { name: "Portfolio Host Founding", price: 89, max: null },
                  founding_cleaner_solo:   { name: "Cleaner Solo Founding",   price: 19, max: null },
                };
                const nextPlan = subscription.next_subscription ? FOUNDING_PLANS[subscription.next_subscription] : null;
                const allowedProps = nextPlan ? nextPlan.max : (subscription.max_properties ?? null);

                if (isBeta) {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Status</span>
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
                          Beta Access
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Cost</span>
                        <span className="font-semibold text-teal-700">Free</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Properties allowed</span>
                        <span className="font-medium text-gray-900">
                          {allowedProps === null ? "Unlimited" : allowedProps === 1 ? "1" : `Up to ${allowedProps}`}
                        </span>
                      </div>
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">After Beta</p>
                        {nextPlan ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 text-sm">Plan</span>
                              <span className="font-medium text-gray-900 text-sm">{nextPlan.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 text-sm">Price</span>
                              <span className="font-semibold text-amber-700">£{nextPlan.price}/mo</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 text-sm">Start date</span>
                              <span className="text-sm text-gray-400 italic">TBC</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center pt-1">
                            <p className="text-xs text-amber-600 mb-2">No founding plan selected yet</p>
                            <Link to={createPageUrl("Subscription")}>
                              <Button size="sm" variant="outline" className="text-xs w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                                Choose Your Plan
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Status</span>
                      <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                        {subscription.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Plan</span>
                      <Badge className="capitalize bg-teal-100 text-teal-700 border border-teal-200 font-semibold">
                        {(subscription.plan || '').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Cost</span>
                      <span className="font-medium">£{subscription.price_monthly}/month</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Properties</span>
                      <span>{properties.length} / {subscription.max_properties || "∞"}</span>
                    </div>
                    {subscription.end_date && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-600 text-sm">
                          {subscription.status === "cancelled" ? "Expires on" : "Renews"}
                        </span>
                        <span className="text-sm font-medium">
                          {format(parseISO(subscription.end_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {subscription.status === "cancelled" && (
                      <Link to={createPageUrl("Subscription")} className="block mt-4">
                        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">Resubscribe</Button>
                      </Link>
                    )}
                  </div>
                );
              })() : (
                <div className="text-center">
                  <p className="text-gray-500 mb-3">No active subscription</p>
                  <Link to={createPageUrl("Subscription")}>
                    <Button variant="outline" size="sm">View Plans</Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

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
                If you want to add more than one property, please see
                subscription upgrades.
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

      {/* Change Policy Dialog */}
      <PolicyPickerDialog
        open={showPolicyDialog}
        onOpenChange={setShowPolicyDialog}
        policies={cancellationPolicies}
        value={policyDraft}
        onChange={(val) => savePolicyMutation.mutate({ propertyId: selectedPropertyId, policyId: val })}
        title="Change Cancellation Policy"
        description={`For ${properties.find((p) => p.id === selectedPropertyId)?.title}. This change will only apply to new bookings — existing bookings keep their original policy.`}
        confirmLabel={savePolicyMutation.isPending ? "Saving…" : "Confirm Change"}
        showNote={true}
      />

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        hostId={user?.id}
      />
    </div>
  );
}