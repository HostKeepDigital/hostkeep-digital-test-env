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
import { Sparkles, CheckCircle2, Clock, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { getUserRoles, addUserRole } from "@/components/utils/roleHelpers";

export default function BecomeCleaner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState({
    service_area: "",
    availability: "",
    experience: ""
  });

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      if (userData?.id) {
        const roles = await getUserRoles(userData.id);
        setUserRoles(roles);
        
        // Check if already a cleaner
        if (roles.includes('cleaner')) {
          navigate(createPageUrl('CleanerDashboard'));
        }
      }
    }).catch(() => {
      // Not logged in - redirect to login first
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const { data: existingApplication } = useQuery({
    queryKey: ['cleaner-application', user?.id],
    queryFn: () => base44.entities.RoleApplication.filter({ 
      user_id: user.id, 
      requested_role: 'cleaner' 
    }),
    enabled: !!user?.id,
  });

  const applicationMutation = useMutation({
    mutationFn: async (data) => {
      // Create application
      await base44.entities.RoleApplication.create({
        user_id: user.id,
        requested_role: 'cleaner',
        service_area: data.service_area,
        availability: data.availability,
        experience: data.experience,
        status: 'pending'
      });

      // Auto-approve and add role (in production, this would be admin-approved)
      await addUserRole(user.id, 'cleaner');
    },
    onSuccess: () => {
      setIsComplete(true);
      toast.success("Welcome to CleanKeep! You're now a cleaner.");
      setTimeout(() => {
        navigate(createPageUrl('CleanerSignup'));
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.service_area || !formData.availability) {
      toast.error("Please fill in all required fields");
      return;
    }
    applicationMutation.mutate(formData);
  };

  if (existingApplication && existingApplication.length > 0) {
    const app = existingApplication[0];
    if (app.status === 'pending') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Pending</h2>
              <p className="text-gray-600 mb-6">
                Your cleaner application is under review. We'll notify you soon!
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CleanKeep!</h2>
            <p className="text-gray-600 mb-6">
              You're now part of our cleaning workforce. Let's set up your profile!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join CleanKeep</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Flexible cleaning work. Set your own rates. Keep 100% of your earnings.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Clock,
              title: "Earn £15-25/hour",
              description: "Competitive rates for holiday home cleaning. You set your prices."
            },
            {
              icon: MapPin,
              title: "Work Locally",
              description: "Choose jobs in your area. No long commutes."
            },
            {
              icon: Star,
              title: "Build Your Reputation",
              description: "Earn 5-star reviews and get more bookings"
            }
          ].map((benefit, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
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
            <CardTitle>Join Our Cleaning Workforce</CardTitle>
            <CardDescription>
              Tell us about yourself and we'll get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Service Area *</Label>
                <Input
                  placeholder="e.g., Manchester, Salford, Bolton"
                  value={formData.service_area}
                  onChange={(e) => setFormData({...formData, service_area: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Availability *</Label>
                <Input
                  placeholder="e.g., Weekdays 9am-5pm, Weekends flexible"
                  value={formData.availability}
                  onChange={(e) => setFormData({...formData, availability: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Previous cleaning experience (optional)</Label>
                <Textarea
                  placeholder="Tell us about your experience..."
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={applicationMutation.isPending}
              >
                {applicationMutation.isPending ? "Submitting..." : "Apply Now"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Earnings Example */}
        <Card className="mt-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white">Example Weekly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Monday-Friday (10 cleans):</span>
                <span className="text-2xl font-bold">£400</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Weekend (5 cleans):</span>
                <span className="text-2xl font-bold">£250</span>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Weekly total:</span>
                <span className="text-3xl font-bold">£650</span>
              </div>
              <p className="text-sm text-blue-100">
                * Example based on £40-50 per clean. You set your own rates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}