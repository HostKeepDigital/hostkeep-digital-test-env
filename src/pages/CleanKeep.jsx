import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Search, UserPlus, LayoutDashboard, ArrowRight } from "lucide-react";

export default function CleanKeep() {
  const [user, setUser] = useState(null);
  const [cleanerProfile, setCleanerProfile] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Check if user is a cleaner
      const profiles = await base44.entities.Cleaner.filter({ user_id: u.id });
      if (profiles[0]) setCleanerProfile(profiles[0]);
    }).catch(() => {});
  }, []);
  const options = [
    {
      icon: Search,
      title: "I'm a Host Looking for a Cleaner",
      description: "Browse vetted cleaners in your area, check reviews, and hire with confidence.",
      buttonText: "Find a Cleaner",
      route: "CleanerMarketplace",
      color: "teal"
    },
    {
      icon: UserPlus,
      title: "I'm a Cleaner Looking to Join",
      description: "Create your professional profile, set your rates, and connect with holiday home owners.",
      buttonText: "Sign Up as a Cleaner",
      route: "CleanerSignup",
      color: "blue"
    },
    {
      icon: LayoutDashboard,
      title: "Existing Cleaner",
      description: "Access your dashboard to manage jobs, availability, and messages.",
      buttonText: "Go to Dashboard",
      route: "CleanerDashboard",
      color: "purple",
      requiresAuth: true
    }
  ];

  const handleNavigation = (route, requiresAuth) => {
    if (requiresAuth && !user) {
      base44.auth.redirectToLogin(createPageUrl(route));
    } else {
      window.location.href = createPageUrl(route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">The Cleaner Network by HostKeep</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              CleanKeep
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Connecting holiday home owners with trusted cleaning professionals.
            </p>

            {/* Quick Access for Existing Cleaner */}
            {cleanerProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <Link to={createPageUrl('CleanerDashboard')}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Go to My Dashboard
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Selection Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {options.map((option, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 group cursor-pointer">
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-${option.color}-100 to-${option.color}-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <option.icon className={`w-10 h-10 text-${option.color}-600`} />
                    </div>
                    <CardTitle className="text-xl mb-2">{option.title}</CardTitle>
                    <CardDescription className="text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Button 
                      className={`w-full bg-${option.color}-600 hover:bg-${option.color}-700`}
                      size="lg"
                      onClick={() => handleNavigation(option.route, option.requiresAuth)}
                    >
                      {option.buttonText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}