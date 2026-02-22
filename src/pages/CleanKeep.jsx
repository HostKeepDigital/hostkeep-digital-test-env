import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Search, UserPlus, LayoutDashboard, ArrowRight, CheckCircle, Shield, MessageSquare, Star, TrendingUp } from "lucide-react";

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
      title: "Find a Cleaner",
      description: "Browse local, vetted cleaners. Check reviews. Hire with confidence.",
      buttonText: "Browse Cleaners",
      route: "CleanerMarketplace",
      isPrimary: true,
      highlightForHost: true
    },
    {
      icon: UserPlus,
      title: "Join CleanKeep",
      description: "Create your profile, set your rates, and connect with holiday home owners.",
      buttonText: "Become a Cleaner",
      route: "CleanerSignup",
      isPrimary: false,
      highlightForHost: false
    },
    {
      icon: LayoutDashboard,
      title: "Cleaner Dashboard",
      description: "Manage jobs, availability, and messages.",
      buttonText: "Go to Dashboard",
      route: "CleanerDashboard",
      isPrimary: false,
      requiresAuth: true,
      highlightForCleaner: true
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
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              CleanKeep
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 font-medium max-w-3xl mx-auto mb-4">
              The dedicated cleaner network inside HostKeep
            </p>

            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              CleanKeep helps hosts find reliable cleaners and helps cleaners secure consistent holiday-let work — all in one place.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Three Pathways */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {options.map((option, idx) => {
              const shouldHighlight = 
                (option.highlightForHost && user?.role !== 'cleaner') || 
                (option.highlightForCleaner && cleanerProfile);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={option.isPrimary ? 'md:scale-105' : ''}
                >
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 border-2 group cursor-pointer ${
                    shouldHighlight 
                      ? 'border-teal-500 bg-teal-50/50' 
                      : option.isPrimary 
                        ? 'hover:border-teal-400' 
                        : 'hover:border-blue-300'
                  }`}>
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto w-16 h-16 rounded-xl bg-gradient-to-br ${
                        option.isPrimary ? 'from-teal-100 to-teal-200' : 'from-blue-100 to-blue-200'
                      } flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <option.icon className={`w-8 h-8 ${
                          option.isPrimary ? 'text-teal-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <CardTitle className="text-lg mb-2">{option.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {option.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button 
                        className={`w-full ${
                          option.isPrimary 
                            ? 'bg-teal-600 hover:bg-teal-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        size="lg"
                        onClick={() => handleNavigation(option.route, option.requiresAuth)}
                      >
                        {option.buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Is CleanKeep? */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="text-2xl text-center mb-2">What Is CleanKeep?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-teal-600" />
                      Built for Holiday Lets
                    </h3>
                    <ul className="space-y-3 text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>Cleaner availability synced with bookings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MessageSquare className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>Direct messaging</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>Transparent reviews</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>No commission taken</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Fair & Professional
                    </h3>
                    <ul className="space-y-3 text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>Subscription-based</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>No race-to-the-bottom pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>Merit-based reviews</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}