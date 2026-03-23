import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Crown, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CleanerSubscriptionPay() {
  const urlParams = new URLSearchParams(window.location.search);
  const cleanerId = urlParams.get('id');
  const plan = urlParams.get('plan');
  
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const { data: cleaner, isLoading } = useQuery({
    queryKey: ['cleaner', cleanerId],
    queryFn: () => base44.entities.Cleaner.filter({ id: cleanerId }).then(r => r[0]),
    enabled: !!cleanerId,
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!cleaner) throw new Error('Cleaner not found');
      
      // Calculate subscription end date (30 days for trial, 1 month for paid)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // Update cleaner subscription
      await base44.entities.Cleaner.update(cleaner.id, {
        subscription_plan: plan || 'basic',
        subscription_status: 'active',
        subscription_expires: format(endDate, 'yyyy-MM-dd')
      });
    },
    onSuccess: () => {
      setPaymentComplete(true);
      setTimeout(() => {
        navigate('/cleaner-dashboard');
      }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to activate subscription');
      setProcessing(false);
    }
  });

  const handleActivateSubscription = async () => {
    setProcessing(true);
    subscriptionMutation.mutate();
  };

  if (!cleanerId || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-rose-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Subscription Link</h2>
            <p className="text-gray-500">Missing required information for subscription activation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cleaner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-rose-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cleaner Not Found</h2>
            <p className="text-gray-500">The cleaner profile could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planDetails = {
    basic: { name: 'CleanKeep Solo Basic', price: 9.99, color: 'blue' },
    pro: { name: 'CleanKeep Solo Pro', price: 19.99, color: 'indigo' }
  };

  const planInfo = planDetails[plan] || planDetails.basic;

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Subscription Activated!
              </h2>
              <p className="text-gray-500 mb-6">
                Welcome to CleanKeep {planInfo.name}. Your subscription is now active.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-gray-500">Plan</p>
                    <p className="font-medium">{planInfo.name} Plan</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-500">Monthly Cost</p>
                    <p className="font-medium">£{planInfo.price}/month</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-500">Status</p>
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${planInfo.color}-500 to-${planInfo.color}-600 flex items-center justify-center mx-auto mb-4`}>
            {plan === 'pro' ? (
              <Crown className="w-8 h-8 text-white" />
            ) : (
              <Sparkles className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Activate {planInfo.name} Plan</h1>
          <p className="text-gray-500 mt-2">Complete your subscription setup</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subscription Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Cleaner</span>
                <span className="font-medium">{cleaner.business_name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Plan</span>
                <span className="font-medium">{planInfo.name} Plan</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="font-bold text-lg">£{planInfo.price}/month</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Trial Period</span>
                <Badge className="bg-blue-100 text-blue-700">30 Days Free</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              {plan === 'pro' ? (
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Priority search placement
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Auto-accept job rules
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Earnings analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Verified Cleaner Badge
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Repeat client matching
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Profile listing
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Availability calendar
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Job notifications
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Messaging
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Reviews
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-900 mb-4">
                ✨ <strong>30-day free trial</strong> • No payment required • Cancel anytime
              </p>
              <Button
                onClick={handleActivateSubscription}
                disabled={processing}
                className={`w-full py-6 text-lg bg-${planInfo.color}-600 hover:bg-${planInfo.color}-700`}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Activate {planInfo.name} Plan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-sm text-gray-500">
          Your subscription will start with a 30-day free trial.
        </p>
      </div>
    </div>
  );
}