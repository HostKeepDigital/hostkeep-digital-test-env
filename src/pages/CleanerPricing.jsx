import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CleanerPricingManager from "@/components/cleaners/CleanerPricingManager";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

export default function CleanerPricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: cleanerProfile, isLoading } = useQuery({
    queryKey: ["cleaner-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Cleaner.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!cleanerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Cleaner profile not found</p>
          <Button onClick={() => navigate("/CleanerDashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/CleanerDashboard")} className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CleanerPricingManager
            cleaner={cleanerProfile}
            onUpdate={(updated) => {
              queryClient.setQueryData(["cleaner-profile", user?.id], updated);
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}