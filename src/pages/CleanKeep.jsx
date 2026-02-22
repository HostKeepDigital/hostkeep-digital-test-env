import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, MessageSquare, Star, TrendingUp, Shield, CheckCircle, 
  Users, MapPin, Clock, Sparkles, Award, Home
} from "lucide-react";
import { motion } from "framer-motion";

export default function CleanKeep() {
  const pricingPlans = [
    {
      name: "Basic",
      price: 5,
      features: [
        "Public cleaner profile",
        "Availability calendar",
        "Job notifications",
        "Direct messaging",
        "Reviews & ratings",
        "Full pricing control"
      ]
    },
    {
      name: "Pro",
      price: 10,
      popular: true,
      features: [
        "Everything in Basic",
        "Priority placement in search",
        "Auto-accept job option",
        "Repeat client management",
        "Earnings analytics",
        '"Verified Cleaner" badge'
      ]
    }
  ];

  const steps = [
    {
      icon: Users,
      title: "Create Your Profile",
      description: "Add your bio, service area, rates, availability, and photos of past work."
    },
    {
      icon: MapPin,
      title: "Get Found by Hosts",
      description: "Hosts browse local cleaners directly through the Cleaner Marketplace."
    },
    {
      icon: CheckCircle,
      title: "Accept Jobs",
      description: "Receive notifications when bookings require cleaning."
    },
    {
      icon: Star,
      title: "Build Your Reputation",
      description: "Earn reviews and grow long-term client relationships."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white rounded-full shadow-sm border border-teal-100">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">The Cleaner Network by HostKeep</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              CleanKeep
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-4">
              Flexible holiday home cleaning work.<br />
              Direct contact with hosts.<br />
              No agency commissions.
            </p>
            
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              CleanKeep connects reliable cleaners with independent UK holiday home owners who need trusted, professional support.
            </p>
            
            <Link to={createPageUrl('CleanerSignup')}>
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-lg px-8 py-6 h-auto">
                Start Your 30-Day Free Trial
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why CleanKeep Exists */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why CleanKeep Exists</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Holiday-let cleaning isn't standard domestic cleaning.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-teal-100">
              <CardHeader>
                <CardTitle className="text-2xl">Hosts struggle to find:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span>Reliable cleaners</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span>Short-notice availability</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span>Professionals who understand holiday-let standards</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span>Someone they trust when they're away</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="text-2xl">Cleaners struggle to find:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span>Consistent work</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span>Reliable hosts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span>Affordable advertising</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span>A way to build a reputation</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-2">
              There has never been a simple, low-cost platform connecting the two.
            </p>
            <p className="text-2xl font-bold text-teal-600">CleanKeep changes that.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            A Dedicated Cleaning Marketplace Inside HostKeep
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12">
            CleanKeep is fully integrated into the HostKeep platform — connecting you directly with active holiday home owners.
          </p>

          <Card className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200">
            <CardHeader>
              <CardTitle className="text-2xl">For a simple monthly subscription, you get:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Professional public profile</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span>Availability calendar</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-teal-600" />
                  <span>Job notifications</span>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <span>Direct messaging with hosts</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-teal-600" />
                  <span>Reviews & ratings</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  <span>Full control over your pricing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span>Repeat client management</span>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-white rounded-lg border-2 border-teal-200">
                <p className="text-lg font-semibold text-center text-gray-900">
                  No middleman. No commission taken from your work.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 text-center mb-12">No hidden fees. Cancel anytime.</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-2 border-teal-500 shadow-lg' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-gray-900">
                    £{plan.price}<span className="text-lg text-gray-500">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={createPageUrl('CleanerSignup')}>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">
                      Start Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="text-center h-full">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                      <step.icon className="w-8 h-8 text-teal-600" />
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Cleaner Dashboard</h2>
          <p className="text-lg text-gray-600 text-center mb-12">Your control centre includes:</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  <h3 className="font-semibold text-lg">Availability calendar</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-teal-600" />
                  <h3 className="font-semibold text-lg">Job requests & confirmations</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-6 h-6 text-teal-600" />
                  <h3 className="font-semibold text-lg">Messaging system</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-teal-600" />
                  <h3 className="font-semibold text-lg">Earnings tracking</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-6 h-6 text-teal-600" />
                  <h3 className="font-semibold text-lg">Review management</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-center mt-8 text-gray-600">
            Pro members can enable automated booking after guest checkout.
          </p>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-16 px-4 bg-gradient-to-br from-teal-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Built Into a Growing Ecosystem</h2>
          <p className="text-lg text-gray-600 mb-8">
            CleanKeep is part of the wider HostKeep platform connecting:
          </p>
          
          <div className="flex justify-center gap-8 mb-8 flex-wrap">
            <Badge className="text-lg px-6 py-3 bg-teal-600">Hosts</Badge>
            <Badge className="text-lg px-6 py-3 bg-purple-600">Guests</Badge>
            <Badge className="text-lg px-6 py-3 bg-blue-600">Cleaners</Badge>
          </div>

          <Card className="bg-white">
            <CardContent className="pt-6 space-y-3 text-left">
              <p className="text-gray-700">→ More hosts → more bookings</p>
              <p className="text-gray-700">→ More bookings → more cleaning demand</p>
              <p className="text-gray-700">→ More cleaners → easier hosting → more hosts</p>
              <p className="text-center text-lg font-semibold text-teal-600 mt-6">
                This creates a self-sustaining system that grows over time.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Review System */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Fair, Merit-Based Review System
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-2 border-teal-200">
              <CardContent className="pt-6">
                <Star className="w-8 h-8 text-teal-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">Hosts rate cleaners</h3>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-200">
              <CardContent className="pt-6">
                <Star className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-lg mb-2">Cleaners rate hosts</h3>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="pt-6 space-y-3">
              <p className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Transparent feedback
              </p>
              <p className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Top performers rise naturally
              </p>
              <p className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                Quality work gets rewarded with more visibility and more jobs
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Cleaners Choose CleanKeep
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, text: "Extremely low monthly cost" },
              { icon: Shield, text: "No commission on earnings" },
              { icon: Users, text: "Direct working relationships" },
              { icon: CheckCircle, text: "Repeat bookings" },
              { icon: Calendar, text: "Flexible schedule" },
              { icon: Award, text: "Professional positioning (not gig-economy style)" }
            ].map((item, idx) => (
              <Card key={idx} className="text-center">
                <CardContent className="pt-6">
                  <item.icon className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                  <p className="font-medium">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center mt-12 text-lg font-semibold text-gray-700">
            One additional cleaning job per month easily covers the subscription.
          </p>
        </div>
      </section>

      {/* UK Focus */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Designed for the UK Holiday Market 🇬🇧
          </h2>
          <p className="text-lg text-gray-600 mb-8">Focused on:</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Home className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                <p className="font-medium">Coastal holiday homes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <MapPin className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                <p className="font-medium">Countryside stays</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Star className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                <p className="font-medium">Staycation hotspots</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-lg text-gray-600 mt-8">
            As HostKeep grows, so does your opportunity pipeline.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Getting Consistent Cleaning Work
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join CleanKeep today and connect with trusted holiday home owners near you.
          </p>
          <Link to={createPageUrl('CleanerSignup')}>
            <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}