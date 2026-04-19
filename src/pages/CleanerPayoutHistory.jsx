import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoundSterling, Download, Loader2, Calendar, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

function groupByMonth(jobs) {
  const map = {};
  for (const job of jobs) {
    const date = job.completed_at ? new Date(job.completed_at) : new Date(job.scheduled_date);
    const key = format(date, "yyyy-MM");
    if (!map[key]) map[key] = { label: format(date, "MMMM yyyy"), jobs: [] };
    map[key].jobs.push(job);
  }
  // Sort descending
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

function jobBasePrice(job) {
  // If mileage is stored separately, cleaner_price is the total; we show the split
  const mileage = job.mileage_price || 0;
  const base = (job.cleaner_price || 0) - mileage;
  return { base, mileage, total: job.cleaner_price || 0 };
}

function downloadCSV(jobs) {
  const header = ["Date", "Property", "Base Price", "Mileage", "Total"];
  const rows = jobs.map((job) => {
    const { base, mileage, total } = jobBasePrice(job);
    const date = job.completed_at
      ? format(new Date(job.completed_at), "d MMM yyyy")
      : format(new Date(job.scheduled_date), "d MMM yyyy");
    const address = `"${(job.property_details?.address || "Property").replace(/"/g, '""')}"`;
    return [date, address, base.toFixed(2), mileage.toFixed(2), total.toFixed(2)].join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "earnings_history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CleanerPayoutHistory() {
  const { user, isAuthenticated } = useAuth();

  const { data: cleanerProfile } = useQuery({
    queryKey: ["cleaner-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Cleaner.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  const { data: completedJobs = [], isLoading } = useQuery({
    queryKey: ["cleaner-completed-jobs", cleanerProfile?.id],
    queryFn: () =>
      base44.entities.CleaningJob.filter({
        cleaner_id: cleanerProfile?.id,
        status: "completed",
      }),
    enabled: !!cleanerProfile?.id,
  });

  const months = groupByMonth(completedJobs);
  const runningTotal = completedJobs.reduce((s, j) => s + (j.cleaner_price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                <PoundSterling className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Earnings History</h1>
                <p className="text-sm text-gray-500">All completed cleaning jobs</p>
              </div>
            </div>
            {completedJobs.length > 0 && (
              <Button
                onClick={() => downloadCSV(completedJobs)}
                className="bg-[#2563EB] hover:bg-blue-700 gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            )}
          </div>
        </motion.div>

        {/* Summary */}
        {completedJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                    <p className="text-2xl font-bold text-gray-900">£{runningTotal.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Jobs Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && completedJobs.length === 0 && (
          <Card>
            <CardContent className="text-center py-16">
              <PoundSterling className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No completed jobs yet</p>
              <p className="text-gray-400 text-sm mt-1">Your earnings will appear here once jobs are completed.</p>
            </CardContent>
          </Card>
        )}

        {/* Monthly groups */}
        <div className="space-y-6">
          {months.map(({ label, jobs }, idx) => {
            const monthTotal = jobs.reduce((s, j) => s + (j.cleaner_price || 0), 0);
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-800">{label}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm font-semibold">
                        £{monthTotal.toFixed(2)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-2.5">Date</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-2.5">Property</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-2.5">Base</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-2.5">Mileage</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {jobs
                            .slice()
                            .sort((a, b) => {
                              const da = a.completed_at || a.scheduled_date;
                              const db = b.completed_at || b.scheduled_date;
                              return db.localeCompare(da);
                            })
                            .map((job) => {
                              const { base, mileage, total } = jobBasePrice(job);
                              const dateVal = job.completed_at || job.scheduled_date;
                              return (
                                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                    {format(new Date(dateVal), "d MMM")}
                                  </td>
                                  <td className="px-5 py-3 text-gray-900 max-w-[200px] truncate">
                                    {job.property_details?.address || "Property"}
                                  </td>
                                  <td className="px-5 py-3 text-gray-700 text-right whitespace-nowrap">
                                    £{base.toFixed(2)}
                                  </td>
                                  <td className="px-5 py-3 text-right whitespace-nowrap">
                                    {mileage > 0
                                      ? <span className="text-gray-600">£{mileage.toFixed(2)}</span>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                  <td className="px-5 py-3 text-right font-semibold text-[#2563EB] whitespace-nowrap">
                                    £{total.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-blue-100 bg-blue-50">
                            <td colSpan={4} className="px-5 py-2.5 text-sm font-semibold text-blue-700">
                              {label} subtotal
                            </td>
                            <td className="px-5 py-2.5 text-right font-bold text-[#2563EB]">
                              £{monthTotal.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Running total */}
        {completedJobs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
            <Card className="border-2 border-[#2563EB]">
              <CardContent className="p-5 flex items-center justify-between">
                <span className="font-bold text-gray-900 text-lg">All-time total</span>
                <span className="font-bold text-[#2563EB] text-2xl">£{runningTotal.toFixed(2)}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}