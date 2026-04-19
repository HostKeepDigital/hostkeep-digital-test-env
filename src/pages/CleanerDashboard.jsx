import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Calendar, Clock, TrendingUp, Star, AlertCircle,
  Crown, PoundSterling, CheckCircle2, MessageSquare, ChevronRight,
  MapPin, Loader2,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import CleanerApprovalBanner, { useCleanerGatesComplete } from "@/components/cleaners/CleanerApprovalBanner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CompleteJobModal from "@/components/cleaner-dashboard/CompleteJobModal";
import ProposeRateModal from "@/components/cleaner-dashboard/ProposeRateModal";
import { format, isToday, parseISO } from "date-fns";

// ─── helpers ────────────────────────────────────────────────────────────────

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return d >= start && d <= end;
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatDate(str) {
  if (!str) return "—";
  return format(parseISO(str), "EEE d MMM yyyy");
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconColor, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Pending Job Card ─────────────────────────────────────────────────────────

function PendingJobCard({ job, gatesComplete, onAccept, onDecline, accepting, declining }) {
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900 truncate">
              {job.property_details?.address || "Property address not set"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
            <div><span className="font-medium text-gray-700">Scheduled:</span> {formatDate(job.scheduled_date)}{job.scheduled_time ? ` at ${job.scheduled_time}` : ""}</div>
            <div><span className="font-medium text-gray-700">Checkout:</span> {job.checkout_date ? formatDate(job.checkout_date) : "—"}</div>
            <div><span className="font-medium text-gray-700">Next check-in:</span> {job.next_checkin_date ? formatDate(job.next_checkin_date) : "—"}</div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-700">Price:</span>
              <span className="text-teal-700 font-semibold">£{job.cleaner_price}</span>
              {job.mileage_miles > 0 && (
                <span className="text-xs text-gray-400">(incl. {job.mileage_miles}mi)</span>
              )}
            </div>
          </div>
        </div>

        {!showDecline && (
          <div className="flex gap-2 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      disabled={!gatesComplete || accepting}
                      onClick={() => onAccept(job)}
                    >
                      {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!gatesComplete && <TooltipContent>Complete your profile setup first</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDecline(true)}
            >
              Decline
            </Button>
          </div>
        )}
      </div>

      {showDecline && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDecline(job, declineReason)}
              disabled={declining}
            >
              {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Decline"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowDecline(false); setDeclineReason(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upcoming Job Card ────────────────────────────────────────────────────────

function UpcomingJobCard({ job, onStartJob, onOpenComplete, onProposeRate, starting }) {
  const canStart = isToday(parseISO(job.scheduled_date));
  const inProgress = job.status === "in_progress";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {inProgress ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">In Progress</Badge>
            ) : (
              <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">Accepted</Badge>
            )}
          </div>
          <div className="font-semibold text-gray-900 truncate mb-1">
            {job.property_details?.address || "Property"}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            <span><Calendar className="w-3.5 h-3.5 inline mr-1 text-teal-500" />{formatDate(job.scheduled_date)}{job.scheduled_time ? ` · ${job.scheduled_time}` : ""}</span>
            <span className="text-teal-700 font-semibold">£{job.cleaner_price}</span>
          </div>
          <button
            onClick={() => onProposeRate(job)}
            className="text-xs text-blue-600 hover:underline mt-1 text-left"
          >
            Propose a different rate for this property
          </button>
        </div>
        <div className="flex-shrink-0">
          {inProgress ? (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onOpenComplete(job)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete Job
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                      disabled={!canStart || starting}
                      onClick={() => onStartJob(job)}
                    >
                      {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Job"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canStart && <TooltipContent>Only available on the scheduled date</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function CleanerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [completeModalJob, setCompleteModalJob] = useState(null);
  const [proposeRateJob, setProposeRateJob] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [startingId, setStartingId] = useState(null);

  const { refreshing } = usePullToRefresh([
    ["cleaner-profile"],
    ["cleaner-jobs"],
  ]);

  const { data: cleanerProfile } = useQuery({
    queryKey: ["cleaner-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Cleaner.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  // Single query for all jobs — filter client-side
  const { data: allJobs = [] } = useQuery({
    queryKey: ["cleaner-jobs", cleanerProfile?.id],
    queryFn: () => base44.entities.CleaningJob.filter({ cleaner_id: cleanerProfile?.id }),
    enabled: !!cleanerProfile?.id,
  });

  const gatesComplete = useCleanerGatesComplete(cleanerProfile, user);

  const pendingJobs = allJobs.filter((j) => j.status === "pending");
  const upcomingJobs = allJobs
    .filter((j) => j.status === "accepted" || j.status === "in_progress")
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""));
  const completedJobs = allJobs.filter((j) => j.status === "completed");

  const upcomingThisWeek = upcomingJobs.filter((j) => isThisWeek(j.scheduled_date)).length;
  const completedThisMonth = completedJobs.filter((j) => isThisMonth(j.completed_at));
  const earningsThisMonth = completedThisMonth.reduce((s, j) => s + (j.cleaner_price || 0), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cleaner-jobs", cleanerProfile?.id] });

  const handleAccept = async (job) => {
    setAcceptingId(job.id);
    await base44.entities.CleaningJob.update(job.id, {
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });
    await invalidate();
    setAcceptingId(null);
  };

  const handleDecline = async (job, reason) => {
    setDecliningId(job.id);
    await base44.entities.CleaningJob.update(job.id, {
      status: "declined",
      declined_reason: reason || "",
    });
    await invalidate();
    setDecliningId(null);
  };

  const handleStartJob = async (job) => {
    setStartingId(job.id);
    await base44.entities.CleaningJob.update(job.id, { status: "in_progress" });
    await invalidate();
    setStartingId(null);
  };

  const handleJobCompleted = () => {
    setCompleteModalJob(null);
    invalidate();
  };

  // No profile yet
  if (cleanerProfile === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Sparkles className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CleanKeep</h2>
          <p className="text-gray-600 mb-6">Set up your cleaner profile to start receiving jobs.</p>
          <Link to={createPageUrl("CleanerSignup")}>
            <Button className="bg-teal-600 hover:bg-teal-700">Create Cleaner Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!cleanerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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

      <div className="max-w-7xl mx-auto px-4 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.full_name?.split(" ")[0] || "there"}!
              </h1>
              {cleanerProfile.business_name && (
                <p className="text-gray-500 text-sm mt-0.5">{cleanerProfile.business_name}</p>
              )}
            </div>
            {cleanerProfile.subscription_plan === "pro" && (
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 border-0 text-sm px-3 py-1.5">
                <Crown className="w-4 h-4 mr-1.5" />
                Pro Member
              </Badge>
            )}
          </div>
          <CleanerApprovalBanner cleanerProfile={cleanerProfile} user={user} />
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Jobs" value={pendingJobs.length} icon={Clock} iconColor="bg-amber-500" delay={0.05} />
          <StatCard label="Upcoming This Week" value={upcomingThisWeek} icon={Calendar} iconColor="bg-teal-500" delay={0.1} />
          <StatCard label="Completed This Month" value={completedThisMonth.length} icon={CheckCircle2} iconColor="bg-green-500" delay={0.15} />
          <StatCard label="Earnings This Month" value={`£${earningsThisMonth.toFixed(2)}`} icon={PoundSterling} iconColor="bg-[#1E3A5F]" delay={0.2} />
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Messages", icon: MessageSquare, page: "CleanerMessages", color: "text-indigo-600" },
            { label: "Pricing", icon: PoundSterling, page: "CleanerPricing", color: "text-green-600" },
            { label: "My Profile", icon: Star, page: `CleanerProfile?id=${cleanerProfile.id}`, color: "text-amber-500" },
            { label: "Earnings", icon: PoundSterling, page: "CleanerPayoutHistory", color: "text-blue-600" },
            { label: "Marketplace", icon: Sparkles, page: "CleanerMarketplace", color: "text-teal-600" },
          ].map(({ label, icon: Icon, page, color }) => (
            <Link key={page} to={`/${page}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
                  <span className="font-medium text-gray-800 text-sm">{label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Pending Jobs */}
        {pendingJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Pending Requests
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-1">{pendingJobs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingJobs.map((job) => (
                    <PendingJobCard
                      key={job.id}
                      job={job}
                      gatesComplete={gatesComplete}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      accepting={acceptingId === job.id}
                      declining={decliningId === job.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Upcoming / In-Progress Jobs */}
        {upcomingJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Upcoming Jobs
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 ml-1">{upcomingJobs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingJobs.map((job) => (
                    <UpcomingJobCard
                      key={job.id}
                      job={job}
                      onStartJob={handleStartJob}
                      onOpenComplete={setCompleteModalJob}
                      onProposeRate={setProposeRateJob}
                      starting={startingId === job.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Completed Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Date</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Property</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Price</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedJobs.slice(0, 10).map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                            {job.completed_at ? format(new Date(job.completed_at), "d MMM yyyy") : formatDate(job.scheduled_date)}
                          </td>
                          <td className="px-6 py-3 text-gray-900 font-medium max-w-xs truncate">
                            {job.property_details?.address || "Property"}
                          </td>
                          <td className="px-6 py-3 text-teal-700 font-semibold whitespace-nowrap">
                            £{job.cleaner_price?.toFixed(2) || "0.00"}
                          </td>
                          <td className="px-6 py-3">
                            <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty state */}
        {pendingJobs.length === 0 && upcomingJobs.length === 0 && completedJobs.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs yet</h3>
              <p className="text-gray-500 text-sm">When hosts assign cleaning jobs to you, they'll appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {completeModalJob && (
        <CompleteJobModal
          job={completeModalJob}
          onClose={() => setCompleteModalJob(null)}
          onComplete={handleJobCompleted}
        />
      )}

      {proposeRateJob && (
        <ProposeRateModal
          job={proposeRateJob}
          cleanerId={cleanerProfile?.id}
          onClose={() => setProposeRateJob(null)}
        />
      )}
    </div>
  );
}