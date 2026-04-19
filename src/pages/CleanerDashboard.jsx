import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  Star,
  AlertCircle,
  Crown,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import CleanerApprovalBanner, { useCleanerGatesComplete } from "@/components/cleaners/CleanerApprovalBanner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CleanerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { refreshing } = usePullToRefresh([
    ["cleaner-profile"],
    ["pending-jobs"],
    ["upcoming-jobs"],
    ["completed-jobs"],
  ]);

  const { data: cleanerProfile } = useQuery({
    queryKey: ["cleaner-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Cleaner.filter({
        user_id: user?.id,
      });
      return profiles[0];
    },
    enabled: !!user?.id && isAuthenticated,
  });

  const { data: pendingJobs = [] } = useQuery({
    queryKey: ["pending-jobs", cleanerProfile?.id],
    queryFn: () =>
      base44.entities.CleaningJob.filter({
        cleaner_id: cleanerProfile?.id,
        status: "pending",
      }),
    enabled: !!cleanerProfile?.id,
  });

  const { data: upcomingJobs = [] } = useQuery({
    queryKey: ["upcoming-jobs", cleanerProfile?.id],
    queryFn: () =>
      base44.entities.CleaningJob.filter({
        cleaner_id: cleanerProfile?.id,
        status: "accepted",
      }),
    enabled: !!cleanerProfile?.id,
  });

  const { data: completedJobs = [] } = useQuery({
    queryKey: ["completed-jobs", cleanerProfile?.id],
    queryFn: () =>
      base44.entities.CleaningJob.filter({
        cleaner_id: cleanerProfile?.id,
        status: "completed",
      }),
    enabled: !!cleanerProfile?.id,
  });

  const gatesComplete = useCleanerGatesComplete(cleanerProfile, user);

  const totalEarnings = completedJobs.reduce(
    (sum, job) => sum + (job.cleaner_price || 0),
    0
  );

  const thisMonthEarnings = completedJobs
    .filter((job) => {
      const jobDate = new Date(job.completed_at);
      const now = new Date();
      return (
        jobDate.getMonth() === now.getMonth() &&
        jobDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, job) => sum + (job.cleaner_price || 0), 0);

  // If no profile yet, show onboarding CTA
  if (!cleanerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Sparkles className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to CleanKeep
          </h2>
          <p className="text-gray-600 mb-6">The Cleaner Network by HostKeep</p>
          <p className="text-gray-600 mb-6">
            Set up your cleaner profile to start receiving jobs
          </p>
          <Link to={createPageUrl("CleanerSignup")}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Create Cleaner Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {refreshing && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-white rounded-full shadow px-4 py-1.5 text-xs text-teal-600 font-medium flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Refreshing…
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Welcome back,{" "}
                {user?.full_name?.split(" ")[0] || user?.full_name || "there"}!
              </h1>
              {cleanerProfile.business_name && (
                <p className="text-sm text-gray-500">
                  {cleanerProfile.business_name}
                </p>
              )}
              <p className="text-gray-600">
                Manage your cleaning jobs and profile
              </p>
            </div>
            {cleanerProfile.subscription_plan === "pro" && (
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-lg px-4 py-2">
                <Crown className="w-5 h-5 mr-2" />
                Pro Member
              </Badge>
            )}
          </div>

          <CleanerApprovalBanner cleanerProfile={cleanerProfile} user={user} />
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Pending Jobs</div>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {pendingJobs.length}
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Upcoming</div>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {upcomingJobs.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">This Month</div>
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  £{thisMonthEarnings}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Total Earnings</div>
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  £{totalEarnings}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link to={createPageUrl("CleanerMessages")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6">
                <MessageSquare className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  Messages
                </h3>
                <p className="text-sm text-gray-600">
                  Chat with hosts about your jobs
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("CleanerJobs")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <Calendar className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  View All Jobs
                </h3>
                <p className="text-sm text-gray-600">
                  Manage your job requests and schedule
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("CleanerPricing")}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <DollarSign className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  Pricing
                </h3>
                <p className="text-sm text-gray-600">
                  Manage rates and add-on services
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("CleanerProfile") + "?id=" + cleanerProfile.id}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <Star className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                  My Profile
                </h3>
                <p className="text-sm text-gray-600">
                  Update your profile and settings
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending Jobs */}
        {pendingJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Job Requests ({pendingJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {job.property_details?.address || "Property"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {job.scheduled_date} • {job.scheduled_time} • £
                        {job.cleaner_price}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!gatesComplete}
                              >
                                Accept
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!gatesComplete && (
                            <TooltipContent>
                              Complete your profile setup first
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <Button size="sm" variant="outline">
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}