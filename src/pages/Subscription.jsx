import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Zap, Rocket, Loader2, X, AlertCircle, Building2, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { getUserRoles, hasRole } from "@/components/utils/roleHelpers";

// Lookup key → display name map
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
    max_properties: 5,
    popular: true,
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
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'cleaner' ? 'cleaner' : 'host');
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState(null); // null = loading
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentActivating, setPaymentActivating] = useState(false);
  const [activatedPlanName, setActivatedPlanName] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pollRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u?.id) {
        const roles = await base44.entities.UserRole.filter({ user_id: u.id });
        setUserRoles(roles);
      } else {
        setUserRoles([]);
      }
    }).catch(() => setUserRoles([]));
  }, []);

  // Handle Stripe redirect back to page
  useEffect(() => {
    const success = urlParams.get('success');
    const cancelled = urlParams.get('cancelled');

    if (success === 'true') {
      setPaymentActivating(true);
      window.history.replaceState({}, '', window.location.pathname);

      // Poll every 2s for up to 30s
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const u = await base44.auth.me();
          if (!u?.id) return;
          const subs = await base44.entities.Subscription.filter({ user_id: u.id });
          const active = subs.find(s => s.status === 'active' && !BETA_PLANS.includes(s.plan));
          if (active) {
            clearInterval(pollRef.current);
            const displayName = PLAN_DISPLAY_NAMES[active.plan] || active.plan;
            setActivatedPlanName(displayName);
            setPaymentActivating(false);
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
          }
        } catch {}
        if (attempts >= 15) {
          clearInterval(pollRef.current);
          setPaymentActivating(false);
          toast.error("Could not confirm activation. Please refresh the page.");
        }
      }, 2000);
    } else if (cancelled === 'true') {
      toast.error("Payment cancelled. No changes were made to your account.");
      window.history.replaceState({}, '', window.location.pathname);
    }
    return () => clearInterval(pollRef.current);
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id });
      return subs[0];
    },
    enabled: !!user?.id,
  });

  const isBetaUser = subscription && BETA_PLANS.includes(subscription.plan) && subscription.status === 'active';
  const isPending = userRoles && userRoles.some(r =>
    !['guest'].includes((r.role || '').toLowerCase()) &&
    (r.approval_status || '').toLowerCase() === 'pending'
  );

  // Role-based logic
  const isHost = hasRole(userRoles, 'host');
  const isCleaner = hasRole(userRoles, 'cleaner');
  const showHostTab = isHost && !isCleaner;
  const showCleanerTab = isCleaner && !isHost;
  const showBothTabs = (isHost && isCleaner) || (!isHost && !isCleaner);

  // Set default tab based on roles
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      if (showHostTab && activeTab !== 'host') setActiveTab('host');
      if (showCleanerTab && activeTab !== 'cleaner') setActiveTab('cleaner');
    }
  }, [showHostTab, showCleanerTab]);

  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate('/founding');
      return;
    }
    if (isPending) {
      navigate('/pending');
      return;
    }
    setCheckoutLoading(planId);
    try {
      const response = await base44.functions.invoke('createCheckoutSession', { plan: planId });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error(response.data?.error || 'Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const cancelMutation = useMutation({
    mutationFn: () => {
      return base44.entities.Subscription.update(subscription.id, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success("Subscription cancelled. Access will continue until end of billing period.");
      setShowCancelDialog(false);
      setCancelReason("");
    },
  });

  // Payment activating screen
  if (paymentActivating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment successful — activating your plan...</h2>
          <p className="text-gray-500">This usually takes just a few seconds.</p>
        </div>
      </div>
    );
  }

  // Plan activated success screen
  if (activatedPlanName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
          <p className="text-gray-600 mb-6">Your <span className="font-semibold">{activatedPlanName}</span> plan is now active.</p>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => navigate(createPageUrl('HostDashboard'))}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Pay one flat monthly fee. Keep 100% of your bookings. No commissions. Ever.
          </p>
          {activeTab === 'host' && (
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
              <Star className="w-4 h-4 text-teal-500" />
              Every plan includes every feature — plans only differ by property count
            </div>
          )}

        </motion.div>

        {subscription && subscription.status === 'active' && !isBetaUser && (
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
              £{subscription.price_monthly}/month • Renews {subscription.end_date}
            </p>
          </motion.div>
        )}

        {/* Beta founding member message */}
        {isBetaUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-8 mb-8 text-center max-w-2xl mx-auto"
          >
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-amber-600" />
            </div>
            <Badge className="bg-amber-500 mb-3">Founding Member</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">You have free beta access</h2>
            <p className="text-gray-600 text-base leading-relaxed">
              You are a Founding Member with free beta access. When beta ends, you will be invited to choose your plan at your founding member discount rate.
            </p>
          </motion.div>
        )}

        {/* Plan cards — hidden for beta users */}
        {!isBetaUser && (
          <>
            {/* Plan type tabs */}
                {showBothTabs ? (
                  <div className="flex justify-center mb-8">
                    <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
                      <button
                        onClick={() => setActiveTab('host')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          activeTab === 'host' ? 'bg-teal-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Building2 className="w-4 h-4" /> Host Plans
                      </button>
                      <button
                        onClick={() => setActiveTab('cleaner')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          activeTab === 'cleaner' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" /> Cleaner Plans
                      </button>
                    </div>
                  </div>
                ) : null}

            <div className="grid md:grid-cols-3 gap-6">
              {(activeTab === 'host' ? HOST_PLANS : CLEANER_PLANS).map((plan, idx) => {
                const isCurrentPlan = subscription?.plan === plan.id && subscription?.status === 'active';
                const Icon = plan.icon;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`relative h-full flex flex-col ${
                      plan.popular ? 'border-2 border-violet-500 shadow-lg' : 'border border-gray-200'
                    } ${isCurrentPlan ? `ring-2 ${activeTab === 'cleaner' ? 'ring-blue-500' : 'ring-teal-500'}` : ''}`}>
                      {plan.popular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500">
                          Most Popular
                        </Badge>
                      )}
                      {isCurrentPlan && (
                        <Badge className={`absolute -top-3 right-4 ${activeTab === 'cleaner' ? 'bg-blue-500' : 'bg-teal-500'}`}>
                          Current
                        </Badge>
                      )}

                      <CardHeader className="text-center pb-4">
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                          plan.color === 'teal' ? (activeTab === 'cleaner' ? 'bg-blue-100' : 'bg-teal-100') :
                          plan.color === 'violet' ? 'bg-violet-100' : 'bg-amber-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            plan.color === 'teal' ? (activeTab === 'cleaner' ? 'text-blue-600' : 'text-teal-600') :
                            plan.color === 'violet' ? 'text-violet-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-4xl font-bold text-gray-900">£{plan.price}</span>
                          <span className="text-gray-500">/month</span>
                        </div>
                        {plan.max_properties != null && (
                          <CardDescription className="mt-2 font-semibold text-gray-700">
                            {plan.max_properties === 999 ? 'Unlimited properties' : plan.max_properties === 1 ? '1 property' : `Up to ${plan.max_properties} properties`}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1">
                        <ul className="space-y-3">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                                plan.color === 'teal' ? (activeTab === 'cleaner' ? 'text-blue-500' : 'text-teal-500') :
                                plan.color === 'violet' ? 'text-violet-500' : 'text-amber-500'
                              }`} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter>
                        {isCurrentPlan ? (
                          <Button variant="outline" className="w-full" disabled>
                            Currently Selected
                          </Button>
                        ) : (
                          <Button
                            className={`w-full ${
                              plan.popular
                                ? 'bg-violet-600 hover:bg-violet-700'
                                : activeTab === 'cleaner' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'
                            }`}
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={!!checkoutLoading}
                          >
                            {checkoutLoading === plan.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : subscription?.status === 'active' ? (
                              'Switch to ' + plan.name
                            ) : (
                              'Get Started'
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {subscription?.status === 'active' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-600 mb-2">
                  Do you want to{' '}
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
        )}

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
              "Cancel anytime"
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
                <CheckCircle className={`w-4 h-4 ${activeTab === 'cleaner' ? 'text-blue-500' : 'text-teal-500'}`} />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Cancel Subscription Dialog */}
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
                  <CardTitle className="text-2xl">Wait! Before You Go…</CardTitle>
                  <CardDescription className="text-base mt-2">
                    We're sorry to see you go 😢<br/>
                    Before you cancel, you may want to consider switching to a lower plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-gray-600 text-center">
                    Your access will continue until the end of your billing period.
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
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="too_expensive">Too expensive</SelectItem>
                        <SelectItem value="not_using">Not using enough</SelectItem>
                        <SelectItem value="missing_features">Missing features</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (!cancelReason) {
                        toast.error("Please select a reason before cancelling");
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