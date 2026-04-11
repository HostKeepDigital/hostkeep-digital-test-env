import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Crown,
  Zap,
  Rocket,
  Loader2,
  X,
  AlertCircle,
  Building2,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import MobileSelect from "@/components/MobileSelect";
import { Link, useNavigate } from "react-router-dom";
import { getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/utils/api";

const PLAN_DISPLAY_NAMES = {
  host_starter_monthly: "Single Property Host",
  host_growth_monthly: "Multi Property Host",
  host_pro_monthly: "Portfolio Host",
  cleaner_solo_monthly: "CleanKeep Solo Basic",
  cleaner_pro_monthly: "CleanKeep Solo Pro",
  cleaner_team_monthly: "CleanKeep Team",
  beta_host_access: "Founding Member (Beta Host)",
  beta_cleaner_access: "Founding Member (Beta Cleaner)",
};

const BETA_PLANS = ["beta_host_access", "beta_cleaner_access"];

const HOST_FEATURES = [
  "Calendar management",
  "Direct bookings",
  "Guest messaging",
  "Email notifications",
  "iCal sync",
  "Analytics dashboard",
  "Booking management",
  "Property settings",
];

const HOST_PLANS = [
  {
    id: "host_starter_monthly",
    name: "Single Property Host",
    price: 29,
    icon: Zap,
    color: "teal",
    max_properties: 1,
    features: HOST_FEATURES,
  },
  {
    id: "host_growth_monthly",
    name: "Multi Property Host",
    price: 59,
    icon: Crown,
    color: "violet",
    popular: true,
    max_properties: 5,
    features: HOST_FEATURES,
  },
  {
    id: "host_pro_monthly",
    name: "Portfolio Host",
    price: 99,
    icon: Rocket,
    color: "amber",
    max_properties: 999,
    features: HOST_FEATURES,
  },
];

const CLEANER_SHARED_FEATURES = [
  "Cleaner profile listing",
  "Job management",
  "Host messaging",
  "Availability calendar",
  "Email notifications",
  "Portfolio showcase",
  "Priority placement in search",
  "Auto-accept job option",
  "Repeat client management",
  "Earnings analytics",
  '"Verified Cleaner" badge',
];

const CLEANER_PLANS = [
  {
    id: "cleaner_solo_monthly",
    name: "CleanKeep Solo Basic",
    price: 9.99,
    icon: Zap,
    color: "teal",
    features: [
      "Cleaner profile listing",
      "Job management",
      "Host messaging",
      "Availability calendar",
      "Email notifications",
      "Portfolio showcase",
    ],
  },
  {
    id: "cleaner_pro_monthly",
    name: "CleanKeep Solo Pro",
    price: 19.99,
    icon: Crown,
    color: "violet",
    popular: true,
    features: CLEANER_SHARED_FEATURES,
  },
  {
    id: "cleaner_team_monthly",
    name: "CleanKeep Team",
    price: 39.99,
    icon: Rocket,
    color: "amber",
    features: [
      ...CLEANER_SHARED_FEATURES,
      "Team management",
      "Multiple staff profiles",
    ],
  },
];

export default function Subscription() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab");
  const reasonParam = urlParams.get("reason");
  const upgradeParam = urlParams.get("upgrade");
  const [activeTab, setActiveTab] = useState(
    tabParam === "cleaner" ? "cleaner" : "host",
  );

  const { user, isLoadingAuth: loading } = useAuth();
  const role = user?.role || null;
  const [userRoles, setUserRoles] = useState(null); // null = loading
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentActivating, setPaymentActivating] = useState(false);
  const [activatedPlanName, setActivatedPlanName] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pollRef = useRef(null);

  // Load roles once user is known
  useEffect(() => {
    if (!user?.id) {
      if (!loading && !user) {
        setUserRoles([]); // not logged in
      }
      return;
    }

    let cancelled = false;

    async function loadRoles() {
      try {
        // Try with user.id first (UserCredentials ID)
        let roles = await base44.entities.UserRole.filter({
          user_id: user.id,
        });

        // If no roles found, try looking up via Base44 User entity by email
        if ((!roles || roles.length === 0) && user.email) {
          try {
            const users = await base44.entities.User.filter({ email: user.email });
            const b44UserId = users?.[0]?.id;
            if (b44UserId && b44UserId !== user.id) {
              roles = await base44.entities.UserRole.filter({ user_id: b44UserId });
            }
          } catch (_) {}
        }

        if (!cancelled) {
          setUserRoles(roles || []);
        }
      } catch {
        if (!cancelled) {
          setUserRoles([]);
        }
      }
    }

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  // Handle Stripe Connect return from subscription page
  useEffect(() => {
    const stripeConnectReturn = urlParams.get('stripe_connect_return');
    if (stripeConnectReturn === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.success("Stripe setup submitted! Your account is being verified.");
    } else if (stripeConnectReturn === 'refresh') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle Stripe redirect back to page
  useEffect(() => {
    const success = urlParams.get("success");
    const cancelled = urlParams.get("cancelled");

    if (success === "true") {
      setPaymentActivating(true);
      window.history.replaceState({}, "", window.location.pathname);

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          // Re-validate session
          const session = await api("/functions/checkSession", {});
          if (!session?.authenticated || !session.user_id) {
            return;
          }

          const subs = await base44.entities.Subscription.filter({
            user_id: session.user_id,
          });
          const active = subs.find(
            (s) =>
              s.status === "active" && !BETA_PLANS.includes(s.plan),
          );

          if (active) {
            clearInterval(pollRef.current);
            const displayName =
              PLAN_DISPLAY_NAMES[active.plan] || active.plan;
            setActivatedPlanName(displayName);
            setPaymentActivating(false);
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
          }
        } catch {
          // swallow and retry until attempts exhausted
        }

        if (attempts >= 15) {
          clearInterval(pollRef.current);
          setPaymentActivating(false);
          toast.error(
            "Could not confirm activation. Please refresh the page.",
          );
        }
      }, 2000);
    } else if (cancelled === "true") {
      toast.error("Payment cancelled. No changes were made to your account.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => clearInterval(pollRef.current);
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({
        user_id: user?.id,
      });
      return subs[0] || null;
    },
    enabled: !!user?.id,
  });

  // Also check FoundingMember table by email to catch users without a subscription record yet
  const { data: foundingMemberRecord } = useQuery({
    queryKey: ["foundingMember", user?.email],
    queryFn: async () => {
      const records = await base44.entities.FoundingMember.filter({ email: user?.email });
      return records[0] || null;
    },
    enabled: !!user?.email,
  });

  // A user is a founding/beta member if:
  // 1. Their subscription has is_founding_member=true or is a beta plan
  // 2. OR they exist in the FoundingMember table with an approved/invited status
  const isBetaUser =
    (subscription && (
      (BETA_PLANS.includes(subscription.plan) && subscription.status === "active") ||
      subscription.is_founding_member === true
    )) ||
    (foundingMemberRecord && ['approved', 'invited', 'password_protected'].includes(foundingMemberRecord.approval_status));

  const isPending =
    userRoles &&
    userRoles.some(
      (r) =>
        !["guest"].includes((r.role || "").toLowerCase()) &&
        (r.approval_status || "").toLowerCase() === "pending",
    );

  const isHost = hasRole(userRoles || [], "host");
  const isCleaner = hasRole(userRoles || [], "cleaner");
  const showHostTab = isHost && !isCleaner;
  const showCleanerTab = isCleaner && !isHost;
  const showBothTabs = (isHost && isCleaner) || (!isHost && !isCleaner);

  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      if (showHostTab && activeTab !== "host") setActiveTab("host");
      if (showCleanerTab && activeTab !== "cleaner") setActiveTab("cleaner");
    }
  }, [showHostTab, showCleanerTab, userRoles]);

  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [nextSubscriptionLoading, setNextSubscriptionLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null); // plan awaiting confirmation
  const [showStripePrompt, setShowStripePrompt] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null); // null=unchecked

  const handleSetNextSubscription = async (planId) => {
    setNextSubscriptionLoading(true);
    try {
      await base44.entities.Subscription.update(subscription.id, {
        next_subscription: planId,
      });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setPendingPlan(null);

      // Check stripe status — skip prompt if already connected
      try {
        const res = await base44.functions.invoke('getStripeConnectStatus', {});
        const st = res.data?.status || 'not_connected';
        setStripeStatus(st);
        if (st === 'not_connected') {
          setShowStripePrompt(true);
          return;
        }
      } catch (_) {
        // If check fails, just skip the stripe prompt
      }

      navigate(createPageUrl("HostDashboard"));
    } catch (error) {
      toast.error("Failed to set subscription. Please try again.");
    } finally {
      setNextSubscriptionLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setStripeConnecting(true);
    try {
      const res = await base44.functions.invoke('createStripeConnectLink', {
        return_url: `${window.location.origin}/Subscription?stripe_connect_return=success`,
        refresh_url: `${window.location.origin}/Subscription?stripe_connect_return=refresh`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Failed to start Stripe setup');
        setStripeConnecting(false);
      }
    } catch {
      toast.error('Failed to connect to Stripe. Please try again.');
      setStripeConnecting(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate("/founding");
      return;
    }
    if (isPending) {
      navigate("/pending");
      return;
    }
    setCheckoutLoading(planId);
    try {
      const session_token = localStorage.getItem("session_token");
      const response = await api("/functions/createCheckoutSession", {
        plan: planId,
        user_id: user.id,
        session_token,
      });
      if (response?.url) {
        window.location.href = response.url;
      } else {
        toast.error(response?.error || "Failed to create checkout session");
      }
    } catch (error) {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const cancelMutation = useMutation({
    mutationFn: () => {
      return base44.entities.Subscription.update(subscription.id, {
        status: "cancelled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success(
        "Subscription cancelled. Access will continue until end of billing period.",
      );
      setShowCancelDialog(false);
      setCancelReason("");
    },
  });

  if (paymentActivating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment successful — activating your plan...
          </h2>
          <p className="text-gray-500">
            This usually takes just a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (activatedPlanName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You're all set!
          </h2>
          <p className="text-gray-600 mb-6">
            Your{" "}
            <span className="font-semibold">{activatedPlanName}</span> plan is
            now active.
          </p>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => navigate(createPageUrl("HostDashboard"))}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {(reasonParam === 'new_property' || upgradeParam) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-5 mb-8 text-center border-2 ${
              upgradeParam === 'portfolio'
                ? 'bg-amber-50 border-amber-300'
                : upgradeParam === 'multi'
                ? 'bg-violet-50 border-violet-300'
                : 'bg-teal-50 border-teal-300'
            }`}
          >
            <p className="text-lg font-bold text-gray-900 mb-1">
              {upgradeParam === 'portfolio'
                ? '🚀 Time to upgrade to Portfolio Host'
                : upgradeParam === 'multi'
                ? '🏘️ Time to upgrade to Multi Property Host'
                : '🎉 Your property has been created!'}
            </p>
            <p className="text-sm text-gray-600">
              {upgradeParam === 'portfolio'
                ? 'You have 6 or more properties. Please upgrade to Portfolio Host to continue.'
                : upgradeParam === 'multi'
                ? 'You have more than 1 property. Please upgrade to Multi Property Host to continue.'
                : 'To keep your property live, please choose a subscription plan below. Even during beta, choosing your plan now locks in your founding pricing.'}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Pay one flat monthly fee. Keep 100% of your bookings. No
            commissions. Ever.
          </p>
          {activeTab === "host" && (
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
              <Star className="w-4 h-4 text-teal-500" />
              Every plan includes every feature — plans only differ by property
              count
            </div>
          )}
        </motion.div>

        {subscription && subscription.status === "active" && !isBetaUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-8 text-center"
          >
            <Badge className="bg-teal-500 mb-2">Current Plan</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {PLAN_DISPLAY_NAMES[subscription.plan] || subscription.plan}
            </h2>
            <p className="text-gray-600">
              £{subscription.price_monthly}/month • Renews{" "}
              {subscription.end_date}
            </p>
          </motion.div>
        )}

        {isBetaUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-center max-w-2xl mx-auto"
          >
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-amber-600" />
            </div>
            <Badge className="bg-amber-500 mb-3">Founding Member</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              You have free beta access
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-3">
              All HostKeep features are <strong>completely free</strong> while we're in beta. No charges until beta closes.
            </p>
            <p className="text-gray-600 text-base leading-relaxed mb-6">
              Post-beta plan: <strong>{subscription?.next_subscription ? PLAN_DISPLAY_NAMES[subscription.next_subscription] || subscription.next_subscription : "Not yet selected — choose below"}</strong>
            </p>
            <p className="text-sm text-amber-700 font-medium">
              👇 Select your preferred plan below to lock in your exclusive founding rate for life.
            </p>
          </motion.div>
        )}

        {/* Pricing Tiers */}
        <>
          {showBothTabs ? (
            <div className="flex justify-center mb-8">
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab("host")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "host"
                      ? "bg-teal-600 text-white shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Host Plans
                </button>
                <button
                  onClick={() => setActiveTab("cleaner")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "cleaner"
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Cleaner Plans
                </button>
              </div>
            </div>
          ) : null}

          {/* Free Tier — full width */}
          <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 dark:bg-teal-950 dark:border-teal-800 p-6 text-center mb-8">
            <Badge className="bg-teal-500 text-white mb-3">Current</Badge>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">🎉 Beta — Now</p>
            <p className="text-5xl font-black text-gray-900 dark:text-white mb-2">Free</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">While we're in beta</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">All features unlocked for all founding members during beta.</p>
          </div>

          {/* Founding Pricing Cards with selection for beta users */}
          {activeTab === "host" && (
            <div className="mb-10">
              {isBetaUser && (
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">🔒 Your Exclusive Founding Member Rates</h2>
                  <p className="text-sm text-gray-500 max-w-lg mx-auto">These prices are locked in for life — only available to founding members. Choose the plan that fits your portfolio. You won't be charged until beta ends.</p>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { id: 'founding_host_solo', name: 'Solo Host Founding', price: 19, standard: 29 },
                  { id: 'founding_host_multi', name: 'Multi Host Founding', price: 49, standard: 59 },
                  { id: 'founding_host_portfolio', name: 'Portfolio Host Founding', price: 89, standard: 99 },
                ].map((plan) => (
                  <div key={plan.id} className={`rounded-2xl border-2 p-5 text-center transition-all ${subscription?.next_subscription === plan.id ? 'border-amber-500 bg-amber-50' : 'border-amber-200 bg-white'}`}>
                    <Badge className="bg-amber-500 text-white mb-2">Founding</Badge>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{plan.name}</p>
                    <p className="text-4xl font-black text-gray-900 mb-3">£{plan.price}</p>
                    <p className="text-xs text-gray-500 mb-4">Locked in for founding members<br /><strong>Standard: £{plan.standard}/mo</strong></p>
                    {isBetaUser ? (
                      <Button
                        onClick={() => setPendingPlan(plan)}
                        disabled={subscription?.next_subscription === plan.id}
                        className={`w-full ${
                          subscription?.next_subscription === plan.id
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {subscription?.next_subscription === plan.id ? (
                          'Selected for Beta Exit'
                        ) : (
                          'Choose This Plan'
                        )}
                      </Button>
                    ) : (
                      <div className="text-xs text-gray-500">Choose your plan below</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Founding Pricing Cards (for cleaner plans) */}
          {activeTab === "cleaner" && isBetaUser && (
            <div className="mb-10">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">🔒 Your Exclusive Founding Member Rate</h2>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">This price is locked in for life — only available to founding members. You won't be charged until beta ends.</p>
              </div>
              <div className="rounded-2xl border-2 border-amber-200 bg-white p-5 text-center max-w-sm mx-auto">
                <Badge className="bg-amber-500 text-white mb-2">Founding</Badge>
                <p className="text-sm font-semibold text-gray-900 mb-1">Cleaner Solo Founding</p>
                <p className="text-4xl font-black text-gray-900 mb-3">£19</p>
                <p className="text-xs text-gray-500 mb-4">Locked in for founding members<br /><strong>Standard: £19.99/mo</strong></p>
                <Button
                  onClick={() => setPendingPlan({ id: 'founding_cleaner_solo', name: 'Cleaner Solo Founding', price: 19 })}
                  disabled={subscription?.next_subscription === 'founding_cleaner_solo'}
                  className={`w-full ${
                    subscription?.next_subscription === 'founding_cleaner_solo'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {subscription?.next_subscription === 'founding_cleaner_solo' ? (
                    'Selected for Beta Exit'
                  ) : (
                    'Choose This Plan'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Plan cards */}
          {isBetaUser && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide font-semibold">Standard pricing for reference — your founding rates are above</p>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-6">
            {(activeTab === "host" ? HOST_PLANS : CLEANER_PLANS).map(
              (plan, idx) => {
                const isCurrentPlan =
                  subscription?.plan === plan.id &&
                  subscription?.status === "active";
                const Icon = plan.icon;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card
                      className={`relative h-full flex flex-col ${
                        plan.popular
                          ? "border-2 border-violet-500 shadow-lg"
                          : "border border-gray-200"
                      } ${
                        isCurrentPlan
                          ? `ring-2 ${
                              activeTab === "cleaner"
                                ? "ring-blue-500"
                                : "ring-teal-500"
                            }`
                          : ""
                      }`}
                    >
                      {plan.popular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500">
                          Most Popular
                        </Badge>
                      )}
                      {isCurrentPlan && (
                        <Badge
                          className={`absolute -top-3 right-4 ${
                            activeTab === "cleaner"
                              ? "bg-blue-500"
                              : "bg-teal-500"
                          }`}
                        >
                          Current
                        </Badge>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div
                          className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                            plan.color === "teal"
                              ? activeTab === "cleaner"
                                ? "bg-blue-100"
                                : "bg-teal-100"
                              : plan.color === "violet"
                              ? "bg-violet-100"
                              : "bg-amber-100"
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 ${
                              plan.color === "teal"
                                ? activeTab === "cleaner"
                                  ? "text-blue-600"
                                  : "text-teal-600"
                                : plan.color === "violet"
                                ? "text-violet-600"
                                : "text-amber-600"
                            }`}
                          />
                        </div>
                        <CardTitle className="text-xl">
                          {plan.name}
                        </CardTitle>
                        <div className="mt-2">
                          <span className="text-4xl font-bold text-gray-900">
                            £{plan.price}
                          </span>
                          <span className="text-gray-500">/month</span>
                        </div>
                        {isBetaUser && activeTab === "cleaner" && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 mt-2">
                            First 3 months free
                          </Badge>
                        )}
                        {plan.max_properties != null && (
                          <CardDescription className="mt-2 font-semibold text-gray-700">
                            {plan.max_properties === 999
                              ? "Unlimited properties"
                              : plan.max_properties === 1
                              ? "1 property"
                              : `Up to ${plan.max_properties} properties`}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1">
                        <ul className="space-y-3">
                          {plan.features.map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm text-gray-600"
                            >
                              <CheckCircle
                                className={`w-5 h-5 flex-shrink-0 ${
                                  plan.color === "teal"
                                    ? activeTab === "cleaner"
                                      ? "text-blue-500"
                                      : "text-teal-500"
                                    : plan.color === "violet"
                                    ? "text-violet-500"
                                    : "text-amber-500"
                                }`}
                              />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter>
                        {isBetaUser ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            {activeTab === "cleaner" ? "Claimed — 3 months free" : "Locked in at founding rate"}
                          </Button>
                        ) : isCurrentPlan ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            Currently Selected
                          </Button>
                        ) : (
                          <Button
                            className={`w-full ${
                              plan.popular
                                ? "bg-violet-600 hover:bg-violet-700"
                                : activeTab === "cleaner"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-teal-600 hover:bg-teal-700"
                            }`}
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={!!checkoutLoading}
                          >
                            {checkoutLoading === plan.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : subscription?.status === "active" ? (
                              "Switch to " + plan.name
                            ) : (
                              "Get Started"
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              },
            )}
          </div>

          {!isBetaUser && subscription?.status === "active" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center"
            >
              <p className="text-gray-600 mb-2">
                Do you want to{" "}
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="text-red-600 hover:text-red-700 font-medium underline"
                >
                  cancel your subscription
                </button>
                ?
              </p>
            </motion.div>
          )}
        </>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All plans include:
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            {[
              "No commission fees",
              "Direct payments",
              "Secure platform",
              "Cancel anytime",
            ].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200"
              >
                <CheckCircle
                  className={`w-4 h-4 ${
                    activeTab === "cleaner"
                      ? "text-blue-500"
                      : "text-teal-500"
                  }`}
                />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Plan confirmation overlay */}
      <AnimatePresence>
        {pendingPlan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingPlan(null)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="max-w-md w-full relative">
                <button
                  onClick={() => setPendingPlan(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl">Confirm Your Founding Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700 font-medium mb-1">You're selecting</p>
                    <p className="text-xl font-bold text-gray-900">{pendingPlan.name}</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">£{pendingPlan.price}<span className="text-sm font-normal text-gray-500">/month</span></p>
                  </div>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    Once beta is complete, this will be the subscription plan you move to. Your founding price is <strong>locked in for life</strong>. The exact start date will be confirmed by the HostKeep team.
                  </p>
                  <div className="space-y-2 pt-1">
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      onClick={() => handleSetNextSubscription(pendingPlan.id)}
                      disabled={nextSubscriptionLoading}
                    >
                      {nextSubscriptionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Yes, Please!"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-gray-500 hover:text-gray-700"
                      onClick={() => setPendingPlan(null)}
                      disabled={nextSubscriptionLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stripe Connect prompt — shown after plan selection if not yet connected */}
      <AnimatePresence>
        {showStripePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="max-w-md w-full relative">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-teal-600" />
                  </div>
                  <CardTitle className="text-xl">Plan locked in! 🎉</CardTitle>
                  <CardDescription className="text-base mt-2">
                    One more optional step to start accepting guest bookings now
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-teal-900">Connect your payment account</p>
                    <ul className="space-y-2">
                      {[
                        "Start receiving guest bookings during beta",
                        "You won't be charged anything until beta closes",
                        "HostKeep remains completely free until then",
                        "Just your name, card details & ID for verification",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                          <CheckCircle className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Powered by Stripe Express — you don't need your own Stripe account. Takes about 2 minutes.
                  </p>
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      onClick={handleStripeConnect}
                      disabled={stripeConnecting}
                    >
                      {stripeConnecting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
                      ) : (
                        "Set Up Payments — Free During Beta"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-gray-500 hover:text-gray-700"
                      onClick={() => { setShowStripePrompt(false); navigate(createPageUrl("HostDashboard")); }}
                      disabled={stripeConnecting}
                    >
                      Maybe Later
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCancelDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelDialog(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="max-w-lg w-full relative">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-2xl">
                    Wait! Before You Go…
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    We're sorry to see you go 😢
                    <br />
                    Before you cancel, you may want to consider switching to a
                    lower plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-gray-600 text-center">
                    Your access will continue until the end of your billing
                    period.
                  </p>
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      onClick={() => setShowCancelDialog(false)}
                    >
                      Keep My Plan
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Why are you cancelling?
                    </label>
                    <MobileSelect
                      value={cancelReason}
                      onValueChange={setCancelReason}
                      placeholder="Select a reason"
                      options={[
                        { value: "too_expensive", label: "Too expensive" },
                        { value: "not_using", label: "Not using enough" },
                        { value: "missing_features", label: "Missing features" },
                        { value: "other", label: "Other" },
                      ]}
                      triggerClassName="w-full"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (!cancelReason) {
                        toast.error(
                          "Please select a reason before cancelling",
                        );
                        return;
                      }
                      cancelMutation.mutate();
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Continue to Cancel"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}