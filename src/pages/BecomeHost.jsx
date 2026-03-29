import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Building2,
  DollarSign,
  Home,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasRole } from "@/components/utils/roleHelpers";

export default function BecomeHost() {
  const navigate = useNavigate();

  // Pull from your custom auth system
  const { user, roles, isAuthenticated } = useAuth();

  useEffect(() => {
    // If not logged in → redirect to SignIn
    if (!isAuthenticated) {
      navigate("/SignIn");
      return;
    }

    // If already a host → redirect to dashboard
    if (hasRole(roles, "host")) {
      navigate(createPageUrl("HostDashboard"));
    }
  }, [isAuthenticated, roles, navigate]);

  const handleUpgrade = () => {
    navigate(createPageUrl("CreateProperty"));
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn Extra Income",
      description: "Turn your property into a profitable rental",
    },
    {
      icon: Calendar,
      title: "Flexible Schedule",
      description: "You control when your property is available",
    },
    {
      icon: Home,
      title: "Easy Management",
      description: "Simple tools to manage bookings and guests",
    },
    {
      icon: Building2,
      title: "Professional Support",
      description: "Get help from our support team anytime",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Become a Host
          </h1>
          <p className="text-xl text-gray-600">
            Start earning by sharing your property with travelers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {benefits.map((benefit, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {benefit.description}
                    </p>
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
              Upgrade your account to start listing properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleUpgrade}
              size="lg"
              className="bg-teal-600 hover:bg-teal-700"
            >
              Become a Host Now
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Free to join • No setup fees • Start earning immediately
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}