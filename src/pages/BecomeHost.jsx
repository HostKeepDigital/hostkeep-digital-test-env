import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, CheckCircle2, PoundSterling, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { getUserRoles, addUserRole } from "@/components/utils/roleHelpers";

export default function BecomeHost() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState({
    property_count: 1,
    experience: "",
    why_host: ""
  });

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      if (userData?.id) {
        const roles = await getUserRoles(userData.id);
        setUserRoles(roles);
        
        // Check if already a host
        if (roles.includes('host')) {
          navigate(createPageUrl('HostDashboard'));
        }
      }
    }).catch(() => {
      // Not logged in - redirect to login first
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const { data: existingApplication } = useQuery({
    queryKey: ['host-application', user?.id],
    queryFn: () => base44.entities.RoleApplication.filter({ 
      user_id: user.id, 
      requested_role: 'host' 
    }),
    enabled: !!user?.id,
  });

  const applicationMutation = useMutation({
    mutationFn: async (data) => {
      // Create application
      await base44.entities.RoleApplication.create({
        user_id: user.id,
        requested_role: 'host',
        property_count: data.property_count,
        status: 'pending'
      });

      // Auto-approve and add role (in production, this would be admin-approved)
      await addUserRole(user.id, 'host');
    },
    onSuccess: () => {
      setIsComplete(true);
      toast.success("Welcome to HostKeep! You're now a host.");
      setTimeout(() => {
        navigate(createPageUrl('HostDashboard'));
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.property_count < 1) {
      toast.error("Please enter at least 1 property");
      return;
    }
    applicationMutation.mutate(formData);
  };

  if (existingApplication && existingApplication.length > 0) {
    const app = existingApplication[0];
    if (app.status === 'pending') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Pending</h2>
              <p className="text-gray-600 mb-6">
                Your host application is under review. We'll notify you soon!
              </p>
              <Button onClick={() => navigate(createPageUrl('Home'))} variant="outline">
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h2>
            <p className="text-gray-600 mb-6">
              You're now a HostKeep host. Let's add your first property!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Become a Host</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            List your property on HostKeep and start earning. Keep 100% of your bookings.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: PoundSterling,
              title: "Earn up to £2,000/month",
              description: "Average hosts earn £500-2,000 per month depending on property size and location"
            },
            {
              icon: CheckCircle2,
              title: "Zero Commission",
              description: "Keep 100% of your bookings. Just £19-79/month subscription"
            },
            {
              icon: Calendar,
              title: "Full Control",
              description: "You set your prices, availability, and house rules"
            }
          ].map((benefit, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Start Your Hosting Journey</CardTitle>
            <CardDescription>
              Tell us about your property and we'll get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>How many properties do you want to list?</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.property_count}
                  onChange={(e) => setFormData({...formData, property_count: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div>
                <Label>Previous hosting experience (optional)</Label>
                <Textarea
                  placeholder="Tell us about your experience with short-term rentals..."
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>Why do you want to become a host? (optional)</Label>
                <Textarea
                  placeholder="Share your motivation..."
                  value={formData.why_host}
                  onChange={(e) => setFormData({...formData, why_host: e.target.value})}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="lg"
                disabled={applicationMutation.isPending}
              >
                {applicationMutation.isPending ? "Submitting..." : "Become a Host"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Earnings Calculator */}
        <Card className="mt-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white">Estimated Monthly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Average nightly rate:</span>
                <span className="text-2xl font-bold">£100</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Expected bookings per month:</span>
                <span className="text-2xl font-bold">15 nights</span>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Monthly earnings:</span>
                <span className="text-3xl font-bold">£1,500</span>
              </div>
              <p className="text-sm text-orange-100">
                * Earnings vary by property type, location, and season
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}