import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, CreditCard, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ full_name: "", phone: "", location: "" });
  const [notifications, setNotifications] = useState({
    notifications_bookings: true,
    notifications_messages: true,
    notifications_marketing: false,
  });

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      setProfile({
        full_name: u.full_name || "",
        phone: u.phone || "",
        location: u.location || "",
      });
      setNotifications({
        notifications_bookings: u.notifications_bookings ?? true,
        notifications_messages: u.notifications_messages ?? true,
        notifications_marketing: u.notifications_marketing ?? false,
      });
      if (u?.id) {
        const roles = await base44.entities.UserRole.filter({ user_id: u.id });
        setUserRoles(roles);
      }
    }).catch(() => {});
  }, []);

  const hasPaymentsRole = userRoles.some(r =>
    ['host', 'cleaner'].includes((r.role || '').toLowerCase()) &&
    (r.approval_status || '').toLowerCase() === 'approved'
  );

  useEffect(() => {
    if (!hasPaymentsRole || !user) return;
    base44.functions.invoke('getStripeConnectStatus', {}).then(res => {
      setStripeStatus(res.data);
    }).catch(() => {});
  }, [hasPaymentsRole, user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await base44.auth.updateMe(profile);
    setSaving(false);
    toast.success("Changes saved");
  };

  const handleNotificationToggle = async (field, value) => {
    const updated = { ...notifications, [field]: value };
    setNotifications(updated);
    await base44.auth.updateMe({ [field]: value });
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    const res = await base44.functions.invoke('createStripeConnectLink', {});
    const url = res.data?.url;
    if (url) window.location.href = url;
    setStripeLoading(false);
  };

  const isConnected = stripeStatus?.connected;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            {hasPaymentsRole && (
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="w-4 h-4" /> Payments
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={profile.full_name}
                      onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+44 7123 456789"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={profile.location}
                      onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
                      placeholder="e.g. London, UK"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what emails you'd like to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { field: "notifications_bookings", label: "Booking Notifications", desc: "New bookings, cancellations, and reminders" },
                  { field: "notifications_messages", label: "Message Notifications", desc: "New messages from guests or hosts" },
                  { field: "notifications_marketing", label: "Marketing Emails", desc: "Tips, news, and special offers" },
                ].map(({ field, label, desc }) => (
                  <div key={field} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[field]}
                      onCheckedChange={v => handleNotificationToggle(field, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab — host/cleaner only */}
          {hasPaymentsRole && (
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Payments</CardTitle>
                  <CardDescription>Connect your Stripe account to receive payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Stripe Connected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Not Connected
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={handleStripeConnect}
                    disabled={stripeLoading}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {stripeLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : "Connect with Stripe"}
                  </Button>
                  <p className="text-sm text-gray-500">
                    You need a Stripe account to receive payments. It's free to set up.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}