import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Search, UserPlus, LayoutDashboard, ArrowRight, CheckCircle, Shield, MessageSquare, Star, TrendingUp } from "lucide-react";

export default function CleanKeep() {
  const [user, setUser] = useState(null);
  const [cleanerProfile, setCleanerProfile] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const profiles = await base44.entities.Cleaner.filter({ user_id: u.id });
      if (profiles[0]) setCleanerProfile(profiles[0]);
      if (u?.id) {
        const roles = await base44.entities.UserRole.filter({ user_id: u.id });
        setUserRoles(roles);
      }
    }).catch(() => {}).finally(() => setRolesLoading(false));
  }, []);
  const options = [
    {
      icon: Search,
      title: "Find a Cleaner",
      description: "Browse local, vetted cleaners. Check reviews. Hire with confidence.",
      buttonText: "Browse Cleaners",
      route: "CleanerMarketplace",
      isPrimary: false,
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
            
            <p className="text-xl text-gray-500 mb-8">
              The Cleaner Network by HostKeep
            </p>

            <div className="max-w-2xl mx-auto mb-8">
              <div className="space-y-2 text-lg text-gray-700 font-medium">
                <p>✓ Flexible holiday home cleaning work</p>
                <p>✓ Direct contact with hosts</p>
                <p>✓ No agency commissions</p>
              </div>
            </div>

            <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              CleanKeep connects reliable cleaners with independent UK holiday home owners who need trusted, professional support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Three Pathways */}
      <section className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {rolesLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse mx-auto" />
            </div>
          ) : null}
          <div className={`grid ${
            rolesLoading ? 'hidden' : ''
          } ${(
            {options.filter(option => {
              if (hasRole(userRoles, 'cleaner') || cleanerProfile) {
                if (option.title === "Join CleanKeep") return false;
              }
              // host-only: only "Find a Cleaner"
              if (hasRole(userRoles, 'host') && !hasRole(userRoles, 'cleaner')) {
                return option.title === "Find a Cleaner";
              }
              // cleaner-only: only "Cleaner Dashboard"
              if ((hasRole(userRoles, 'cleaner') || cleanerProfile) && !hasRole(userRoles, 'host')) {
                return option.title === "Cleaner Dashboard";
              }
              // both host+cleaner: Dashboard + Find a Cleaner
              if (hasRole(userRoles, 'host') && (hasRole(userRoles, 'cleaner') || cleanerProfile)) {
                return option.title !== "Join CleanKeep";
              }
              // guest: all options
              return true;
            }).map((option, idx) => {
              const shouldHighlight = 
                (option.highlightForHost && hasRole(userRoles, 'host')) || 
                (option.highlightForCleaner && cleanerProfile);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 border-2 group cursor-pointer ${
                    shouldHighlight 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'hover:border-blue-300'
                  }`}>
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <option.icon className="w-8 h-8 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg mb-2">{option.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {option.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
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

      {/* Why CleanKeep Exists */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-6">
            Why CleanKeep Exists
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12">
            Holiday-let cleaning isn't standard domestic cleaning.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Hosts struggle to find:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                    Reliable cleaners
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                    Short-notice availability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                    Professionals who understand holiday-let standards
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                    Someone they trust when they're away
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Cleaners struggle to find:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    Consistent work
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    Reliable hosts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    Affordable advertising
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    A way to build a reputation
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">
              There has never been a simple, low-cost platform connecting the two.
            </p>
            <p className="text-2xl font-bold text-blue-600">
              CleanKeep changes that.
            </p>
          </div>
        </div>
      </section>

      {/* A Dedicated Cleaning Marketplace */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            A Dedicated Cleaning Marketplace Inside HostKeep
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            CleanKeep is fully integrated into the HostKeep platform — connecting you directly with active holiday home owners.
          </p>

          <Card className="text-left">
            <CardHeader>
              <CardTitle>For a simple monthly subscription, you get:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid md:grid-cols-2 gap-3">
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Professional public profile</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Availability calendar</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Job notifications</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Direct messaging with hosts</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Reviews & ratings</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Full control over your pricing</span>
               </li>
               <li className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-blue-500" />
                 <span>Repeat client management</span>
               </li>
              </ul>
              <p className="text-center text-lg font-semibold text-gray-900 mt-6">
                No middleman. No commission taken from your work.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Simple Transparent Pricing */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-2">
                  £5<span className="text-lg text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Public cleaner profile</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Availability calendar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Job notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Messaging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Reviews & ratings</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Pro
                  <Badge className="bg-blue-600">Popular</Badge>
                </CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-2">
                  £10<span className="text-lg text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Priority placement in search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Auto-accept job option</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Repeat client management tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Earnings analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">"Verified Cleaner" badge</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-gray-600 mt-8">
            No hidden fees. Cancel anytime.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Create Your Profile",
                description: "Add your bio, service area, rates, availability, and photos of past work."
              },
              {
                step: "2",
                title: "Get Found by Hosts",
                description: "Hosts browse local cleaners directly through the Cleaner Marketplace."
              },
              {
                step: "3",
                title: "Accept Jobs",
                description: "Receive notifications when bookings require cleaning."
              },
              {
                step: "4",
                title: "Build Your Reputation",
                description: "Earn reviews and grow long-term client relationships."
              }
            ].map((item, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-3">
                    {item.step}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Sections */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Cleaner Dashboard */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Cleaner Dashboard</h2>
            <p className="text-lg text-gray-600 mb-6">Your control centre includes:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Availability calendar",
                "Job requests & confirmations",
                "Messaging system",
                "Earnings tracking",
                "Review management"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-4 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-6">
              Pro members can enable automated booking after guest checkout.
            </p>
          </div>

          {/* Built Into Growing Ecosystem */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Built Into a Growing Ecosystem
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              CleanKeep is part of the wider HostKeep platform connecting:
            </p>
            <div className="flex justify-center gap-8 mb-6">
              <Badge className="bg-teal-600 text-lg py-2 px-6">Hosts</Badge>
              <Badge className="bg-amber-500 text-lg py-2 px-6">Guests</Badge>
              <Badge className="bg-blue-600 text-lg py-2 px-6">Cleaners</Badge>
            </div>
            <div className="text-left max-w-2xl mx-auto space-y-2 text-gray-700">
              <p>→ More hosts → more bookings</p>
              <p>→ More bookings → more cleaning demand</p>
              <p>→ More cleaners → easier hosting → more hosts</p>
            </div>
            <p className="text-lg font-semibold text-teal-600 mt-6">
              This creates a self-sustaining system that grows over time.
            </p>
          </div>

          {/* Fair Merit-Based Review System */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Fair, Merit-Based Review System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-teal-500" />
                    <span>Hosts rate cleaners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-500" />
                    <span>Cleaners rate hosts</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span>Transparent feedback</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span>Top performers rise naturally</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-gray-600 mt-6">
                Quality work gets rewarded with more visibility and more jobs.
              </p>
            </CardContent>
          </Card>

          {/* Why Cleaners Choose CleanKeep */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Why Cleaners Choose CleanKeep
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Extremely low monthly cost",
                "No commission on earnings",
                "Direct working relationships",
                "Repeat bookings",
                "Flexible schedule",
                "Professional positioning (not gig-economy style)"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-lg text-left">
                  <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-lg font-semibold text-blue-600 mt-8">
              One additional cleaning job per month easily covers the subscription.
            </p>
          </div>


        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Getting Consistent Cleaning Work
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join CleanKeep today and connect with trusted holiday home owners near you.
          </p>
          <Link to={createPageUrl('CleanerSignup')}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}