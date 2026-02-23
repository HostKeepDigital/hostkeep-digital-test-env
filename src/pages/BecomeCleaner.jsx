import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, CheckCircle2, Clock, DollarSign, MapPin } from "lucide-react";
import { toast } from "sonner";
import { addUserRole, getUserRoles, hasRole } from "@/components/utils/roleHelpers";

export default function BecomeCleaner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      if (userData?.id) {
        const roles = await getUserRoles(userData.id);
        setUserRoles(roles);
        
        // If already a cleaner, redirect to signup if no profile
        if (hasRole(roles, 'cleaner')) {
          navigate(createPageUrl('CleanerDashboard'));
        }
      }
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.pathname);
    });
  }, []);

  const handleUpgrade = () => {
    navigate(createPageUrl('CleanerSignup'));
  };

  const benefits = [
    { icon: DollarSign, title: "Great Earnings", description: "Set your own prices and earn on your schedule" },
    { icon: Clock, title: "Flexible Hours", description: "Choose when and where you want to work" },
    { icon: MapPin, title: "Local Jobs", description: "Find cleaning jobs in your area" },
    { icon: Sparkles, title: "Growth Opportunities", description: "Build your reputation and grow your business" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Become a Cleaner</h1>
          <p className="text-xl text-gray-600">
            Join CleanKeep and start earning by helping hosts keep their properties spotless
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {benefits.map((benefit, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
            <CardDescription>
              Upgrade your account to start offering cleaning services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleUpgrade}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Become a Cleaner Now
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Free to join • Complete your profile next • Start getting jobs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}