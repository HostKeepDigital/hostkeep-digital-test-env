import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, CreditCard, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function Settings() {
  const { user, updateUser, openAuthModal } = useAuth();

  const [userRoles, setUserRoles] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(true);
  const stripeCacheRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({ full_name: "", phone: "", location: "" });
  const [notifications, setNotifications] = useState({
    notifications_bookings: true,
    notifications_messages: true,
    notifications_marketing: false,
  });

  // Load user data from auth context
  useEffect(() => {
    if (!user) return;

    setProfile({
      full_name: user.full_name || "",
      phone: user.phone || "",
      location: user.location || "",
    });

    setNotifications({
      notifications_bookings: user.notifications_bookings ?? true,
      notifications_messages: user.notifications_messages ?? true,
      notifications_marketing: user.notifications_marketing ?? false,
    });

    if (user.id) {
      base44.entities.UserRole.filter({ user_id: user.id }).then(setUserRoles);
    }
  }, [user]);

  const hasPaymentsRole = userRoles.some(
    (r) =>
      ["host", "cleaner"].includes((r.role || "").toLowerCase()) &&
      (r.approval_status || "").toLowerCase() === "approved"
  );

  // Handle tab from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  // Stripe status fetch
  const fetchStripeStatus = async (forceRefresh = false) => {
    if (!forceRefresh && stripeCacheRef.current !== null) {
      setStripeStatus(stripeCacheRef.current);
      setStripeStatusLoading(false);
      return;
    }
    setStripeStatusLoading(true);
    try {
      const res = await base44.functions.invoke("getStripeConnectStatus", {});
      const status = res.data?.status || "not_connected";
      stripeCacheRef.current = status;
      setStripeStatus(status);
    } finally {
      setStripeStatusLoading(false);
    }
  };

  // Stripe return handling
  useEffect(() => {
    if (!hasPaymentsRole || !user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const stripeReturn = urlParams.get("stripe_return");

    if (stripeReturn === "success") {
      stripeCacheRef.current = null;
      fetchStripeStatus(true).then(() => {
        window.history.replaceState({}, "", window.location.pathname);
        toast.success("Stripe verification step completed");
      });
    } else if (stripeReturn === "refresh") {
      stripeCacheRef.current = null;
      fetchStripeStatus(true).then(() => {
        window.history.replaceState({}, "", window.location.pathname);
        toast.info("Please complete your Stripe verification");
      });
    } else {
      fetchStripeStatus();
    }
  }, [hasPaymentsRole, user]);

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateUser(profile);
      toast.success("Changes saved");
    } catch {
      toast.error("Failed to save changes. Please try again.");
    }
    setSaving(false);
  };

  // Toggle notifications
  const handleNotificationToggle = async (field, value) => {
    const updated = { ...notifications, [field]: value };
    setNotifications(updated);
    await updateUser({ [field]: value });
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await base44.auth.logout();
      toast.success("Account deletion requested. You have been signed out.");
    } catch {
      toast.error("Something went wrong. Please contact support.");
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
  };

  // Stripe connect
  const handleStripeConnect = async () => {
    setStripeLoading(true);
    const res = await base44.functions.invoke("createStripeConnectLink", {});
    const url = res.data?.url;
    if (url) window.location.href = url;
    setStripeLoading(false);
  };

  const stripeState =
    !stripeStatus || stripeStatus === "not_connected"
      ? "A"
      : stripeStatus === "verified"
      ? "C"
      : "B";

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={openAuthModal} className="bg-teal-600 hover:bg-teal-700">
          Sign in to access settings
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, full_name: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      value={user.email}
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
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+44 7123 456789"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={profile.location}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, location: e.target.value }))
                      }
                      placeholder="e.g. London, UK"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
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
                  {
                    field: "notifications_bookings",
                    label: "Booking Notifications",
                    desc: "New bookings, cancellations, and reminders",
                  },
                  {
                    field: "notifications_messages",
                    label: "Message Notifications",
                    desc: "New messages from guests or hosts",
                  },
                  {
                    field: "notifications_marketing",
                    label: "Marketing Emails",
                    desc: "Tips, news, and special offers",
                  },
                ].map(({ field, label, desc }) => (
                  <div key={field} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[field]}
                      onCheckedChange={(v) => handleNotificationToggle(field, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          {hasPaymentsRole && (
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Payments</CardTitle>
                  <CardDescription>
                    Connect your Stripe account to receive payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {stripeStatusLoading ? (
                    <>
                      <div className="h-6 w-40 bg-gray-200 rounded-full animate-pulse" />
                      <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
                    </>
                  ) : (
                    <>
                      {stripeState === "C" && (
                        <>
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Stripe Connected
                          </Badge>
                          <p className="text-sm text-gray-600">
                            Your account is verified and ready to receive payments.
                          </p>
                        </>
                      )}

                      {stripeState === "B" && (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Verification
                            Incomplete
                          </Badge>
                          <p className="text-sm text-gray-600">
                            Your Stripe account is connected but needs additional
                            verification.
                          </p>
                          <Button
                            onClick={handleStripeConnect}
                            disabled={stripeLoading}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            {stripeLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                              </>
                            ) : (
                              "Complete Verification"
                            )}
                          </Button>
                        </>
                      )}

                      {stripeState === "A" && (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Not Connected
                          </Badge>
                          <Button
                            onClick={handleStripeConnect}
                            disabled={stripeLoading}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            {stripeLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...
                              </>
                            ) : (
                              "Connect with Stripe"
                            )}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Danger Zone */}
        <div className="mt-10 border border-red-200 rounded-xl p-6 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-1 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h3>
          <p className="text-sm text-red-600 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Account</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>This action is permanent and cannot be undone. Type <strong>DELETE</strong> to confirm.</DialogDescription>
          </DialogHeader>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}