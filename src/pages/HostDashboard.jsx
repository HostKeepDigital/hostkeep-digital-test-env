import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, PoundSterling, Calendar, MessageSquare, Settings, Plus, 
  TrendingUp, Users, Star, Eye, ArrowRight, Bell, Crown
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import BookingCalendar from "@/components/dashboard/BookingCalendar";
import { parseISO, isAfter, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function HostDashboard() {
  const [user, setUser] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['host-properties', user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['host-bookings', user?.id],
    queryFn: () => base44.entities.Booking.filter({ host_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['host-messages', user?.id],
    queryFn: () => base44.entities.Message.filter({ receiver_id: user?.id, read: false }),
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id });
      return subs[0];
    },
    enabled: !!user?.id,
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const pendingBookings = bookings.filter(b => b.booking_status === 'pending');
  const confirmedBookings = bookings.filter(b => 
    b.booking_status === 'confirmed' && isAfter(parseISO(b.check_in), today)
  );

  const monthlyEarnings = bookings
    .filter(b => b.booking_status !== 'cancelled' && b.payment_status === 'paid')
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd }))
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const totalEarnings = bookings
    .filter(b => b.booking_status !== 'cancelled' && b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const publishedProperties = properties.filter(p => p.status === 'published').length;

  const handleAddPropertyClick = (e) => {
    // Check if on basic plan with 1 property already
    if (subscription?.plan === 'basic' && subscription?.max_properties === 1 && properties.length >= 1) {
      e.preventDefault();
      setShowUpgradeDialog(true);
    } else {
      window.location.href = createPageUrl('CreateProperty');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-gray-500">Manage your properties and bookings</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingBookings.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Bell className="w-3 h-3 mr-1" />
                {pendingBookings.length} pending
              </Badge>
            )}
            <Button 
              onClick={handleAddPropertyClick}
              className="bg-teal-600 hover:bg-teal-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Subscription Banner */}
        {(!subscription || subscription.status === 'trial') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {subscription ? "Your trial ends soon" : "Start your hosting journey"}
                </h3>
                <p className="text-teal-100">
                  Subscribe to list your properties and start earning
                </p>
              </div>
              <Link to={createPageUrl('Subscription')}>
                <Button className="bg-white text-teal-700 hover:bg-teal-50">
                  View Plans
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="This Month"
            value={`£${monthlyEarnings.toFixed(0)}`}
            icon={PoundSterling}
            color="emerald"
          />
          <StatsCard
            title="Total Earnings"
            value={`£${totalEarnings.toFixed(0)}`}
            icon={TrendingUp}
            color="teal"
          />
          <StatsCard
            title="Properties"
            value={publishedProperties}
            subtitle={`${properties.length} total`}
            icon={Home}
            color="violet"
          />
          <StatsCard
            title="Upcoming"
            value={confirmedBookings.length}
            subtitle="bookings"
            icon={Calendar}
            color="amber"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Pending Requests ({pendingBookings.length})
                </h2>
                <div className="space-y-3">
                  {pendingBookings.slice(0, 3).map(booking => (
                    <Link 
                      key={booking.id} 
                      to={createPageUrl('HostBookings') + `?id=${booking.id}`}
                      className="block p-4 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{booking.guest_name}</p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">£{booking.total_amount}</p>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link 
                  to={createPageUrl('HostBookings')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1 mt-4"
                >
                  View all bookings <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}

            {/* Properties */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Properties</h2>
                <Link 
                  to={createPageUrl('HostProperties')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 mb-4">No properties yet</p>
                  <Link to={createPageUrl('CreateProperty')}>
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      Add Your First Property
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {properties.slice(0, 3).map(property => (
                    <Link 
                      key={property.id}
                      to={createPageUrl('EditProperty') + `?id=${property.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <img 
                        src={property.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200"} 
                        alt={property.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{property.title}</p>
                        <p className="text-sm text-gray-500">£{property.nightly_rate}/night</p>
                      </div>
                      <Badge variant={property.status === 'published' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Calendar */}
            <BookingCalendar bookings={bookings} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link to={createPageUrl('HostBookings')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span className="text-gray-700">Bookings</span>
                  {pendingBookings.length > 0 && (
                    <Badge className="ml-auto bg-amber-100 text-amber-700">{pendingBookings.length}</Badge>
                  )}
                </Link>
                <Link to={createPageUrl('HostMessages')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <span className="text-gray-700">Messages</span>
                  {messages.length > 0 && (
                    <Badge className="ml-auto bg-teal-100 text-teal-700">{messages.length}</Badge>
                  )}
                </Link>
                <Link to={createPageUrl('HostProperties')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Home className="w-5 h-5 text-teal-600" />
                  <span className="text-gray-700">Properties</span>
                </Link>
                <Link to={createPageUrl('HostSettings')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5 text-teal-600" />
                  <span className="text-gray-700">Settings</span>
                </Link>
              </div>
            </motion.div>

            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Subscription</h3>
              {subscription ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Plan</span>
                    <Badge className="capitalize">{subscription.plan}</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Status</span>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Properties</span>
                    <span>{properties.length} / {subscription.max_properties || '∞'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 mb-3">No active subscription</p>
                  <Link to={createPageUrl('Subscription')}>
                    <Button variant="outline" size="sm">View Plans</Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-violet-600" />
              Upgrade Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>If you want to add more than one property, please see subscription upgrades.</p>
              <p className="text-sm text-gray-600">
                Upgrade to <strong>Pro</strong> (up to 5 properties) or <strong>Premium</strong> (unlimited properties).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => window.location.href = createPageUrl('Subscription')}
              className="bg-violet-600 hover:bg-violet-700"
            >
              View Subscription Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}