import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, CreditCard, Loader2, CheckCircle, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import ReviewsDialog from "@/components/reviews/ReviewsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

function SaveBanner({ status }) {
  if (!status) return null;
  if (status === "success") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        Changes saved successfully.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 font-medium">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
      Failed to save changes. Please try again or contact support.
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [userRoles, setUserRoles] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(true);
  const stripeCacheRef = useRef(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [deleteBlockReason, setDeleteBlockReason] = useState(null);

  const [profile, setProfile] = useState({
    forename: "",
    middle_name: "",
    surname: "",
    phone: "",
    location: "",
  });

  const [notifications, setNotifications] = useState({
    bookings: true,
    messages: true,
    jobs: true,
    payments: true,
    marketing: false,
  });

  useEffect(() => {
    if (!user?.email) return;
    setProfileLoading(true);
    base44.functions.invoke("getUserProfile", { email: user.email })
      .then((res) => {
        const u = res.data?.profile;
        if (u) {
          setProfile({ forename: u.forename || "", middle_name: u.middle_name || "", surname: u.surname || "", phone: u.phone || "", location: u.location || "" });
          if (u.notification_preferences && typeof u.notification_preferences === "object") {
            setNotifications((prev) => ({ ...prev, ...u.notification_preferences }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
    if (user?.id) {
      base44.entities.UserRole.filter({ user_id: user.id }).then(setUserRoles).catch(() => {});
    }
  }, [user?.email]);

  const hasPaymentsRole = userRoles.some(
    (r) =>
      ["host", "cleaner"].includes((r.role || "").toLowerCase()) &&
      (r.approval_status || "").toLowerCase() === "approved"
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  const fetchStripeStatus = async (forceRefresh = false) => {
    if (!forceRefresh && stripeCacheRef.current !== null) {
      setStripeStatus(stripeCacheRef.current);
      setStripeStatusLoading(false);
      return;
    }
    setStripeStatusLoading(true);
    try {
      const res = await fetch('/api/apps/698eee4108bd1d9467648326/functions/getStripeConnectStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: localStorage.getItem('session_token') }),
      });
      const resData = await res.json();
      const resDataWrapped = { data: resData };
      const status = res.data?.status || "not_connected";
      stripeCacheRef.current = status;
      setStripeStatus(status);
    } finally {
      setStripeStatusLoading(false);
    }
  };

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

  const handleSaveProfile = async () => {
    setSaveStatus(null);
    if (!profile.forename.trim() || !profile.surname.trim()) { setSaveStatus("error"); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveUserProfile", {
        email: user.email,
        forename: profile.forename.trim(),
        middle_name: profile.middle_name.trim(),
        surname: profile.surname.trim(),
        phone: profile.phone.trim(),
        location: profile.location.trim(),
      });
      if (!res.data?.success) throw new Error(res.data?.error || "save_failed");
      updateUser({ forename: profile.forename.trim(), middle_name: profile.middle_name.trim(), surname: profile.surname.trim(), phone: profile.phone.trim(), location: profile.location.trim() });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error("Save profile error:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async (field, value) => {
    const updated = { ...notifications, [field]: value };
    setNotifications(updated);
    // Persist immediately
    if (user?.id) {
      base44.entities.User.update(user.id, { notification_preferences: updated }).catch(() => {});
    }
  };

  const handleDeletePreCheck = async () => {
  setDeleteBlockReason(null);
  const token = localStorage.getItem("session_token");
  const sessionRes = await fetch("/functions/getUserFromSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: token }),
  });
  const sessionData = await sessionRes.json();
  const foundingMemberId = sessionData?.user?.founding_member_id;
  const role = sessionData?.user?.role;
  const today = new Date().toISOString().split("T")[0];

  const activeBookingStatuses = ["awaiting_decision", "awaiting_payment", "confirmed", "checked_in"];
  const activeJobStatuses = ["pending", "accepted", "in_progress"];

  if (role === "host") {
    const bookings = await base44.entities.Booking.filter({ host_id: foundingMemberId });
    const activeBookings = bookings.filter(b =>
      activeBookingStatuses.includes(b.booking_status) && b.check_out >= today
    );
    if (activeBookings.length > 0) {
      setDeleteBlockReason(`You have ${activeBookings.length} active or upcoming booking(s). All bookings must be completed or cancelled before deleting your account.`);
      return;
    }
    const jobs = await base44.entities.CleaningJob.filter({ host_id: sessionData?.user?.id });
    const activeJobs = jobs.filter(j => activeJobStatuses.includes(j.status));
    if (activeJobs.length > 0) {
      setDeleteBlockReason(`You have ${activeJobs.length} outstanding cleaning job(s). All jobs must be completed or cancelled before deleting your account.`);
      return;
    }
  }

  if (role === "guest") {
    const bookings = await base44.entities.Booking.filter({ guest_id: foundingMemberId });
    const activeBookings = bookings.filter(b =>
      activeBookingStatuses.includes(b.booking_status) && b.check_out >= today
    );
    if (activeBookings.length > 0) {
      setDeleteBlockReason(`You have ${activeBookings.length} upcoming trip(s) or outstanding balance(s). All trips must be completed or cancelled before deleting your account.`);
      return;
    }
    const unpaidBookings = bookings.filter(b =>
      b.payment_status === "partial" && b.booking_status !== "cancelled"
    );
    if (unpaidBookings.length > 0) {
      setDeleteBlockReason(`You have outstanding payment balances on ${unpaidBookings.length} booking(s). Please settle all balances before deleting your account.`);
      return;
    }
  }

  if (role === "cleaner") {
    const jobs = await base44.entities.CleaningJob.filter({ cleaner_user_id: sessionData?.user?.id });
    const activeJobs = jobs.filter(j => activeJobStatuses.includes(j.status));
    if (activeJobs.length > 0) {
      setDeleteBlockReason(`You have ${activeJobs.length} outstanding job(s). All jobs must be completed or removed before deleting your account.`);
      return;
    }
  }

  setDeleteDialogOpen(true);
};

const handleDeleteAccount = async () => {
  if (deleteConfirm !== "DELETE") return;
  setDeleting(true);
  try {
    const token = localStorage.getItem("session_token");
    const res = await fetch("/functions/deleteAccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: token }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    localStorage.removeItem("session_token");
    localStorage.removeItem("session_expires_at");
    window.location.href = "/SignIn";
  } catch {
    toast.error("Something went wrong. Please contact support.");
  }
  setDeleting(false);
  setDeleteDialogOpen(false);
};

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    const _clRes = await fetch('/api/apps/698eee4108bd1d9467648326/functions/createStripeConnectLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: localStorage.getItem('session_token') }),
    });
    const res = { data: await _clRes.json() };
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
        <p className="text-gray-500 text-sm">Please sign in to access settings.</p>
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
                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                <div className="space-y-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>
                      Forename <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={profile.forename}
                      onChange={(e) => {
                        setProfile((p) => ({ ...p, forename: e.target.value }));
                        setSaveStatus(null);
                      }}
                      placeholder="Jane"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>
                      Middle name{" "}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </Label>
                    <Input
                      value={profile.middle_name}
                      onChange={(e) => {
                        setProfile((p) => ({ ...p, middle_name: e.target.value }));
                        setSaveStatus(null);
                      }}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>
                      Surname <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={profile.surname}
                      onChange={(e) => {
                        setProfile((p) => ({ ...p, surname: e.target.value }));
                        setSaveStatus(null);
                      }}
                      placeholder="Smith"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Email Address</Label>
                  <Input
                    value={user.email}
                    disabled
                    className="mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+44 7123 456789"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g. London, UK"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* My Reviews */}
                {user?.id && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">My Reviews</p>
                    <ReviewsDialog
                      revieweeId={user.id}
                      showBothTypes={true}
                      isPrivilegedViewer={true}
                      emptyMessage="No reviews have been left for you yet."
                    />
                  </div>
                )}

                <SaveBanner status={saveStatus} />

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
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what you'd like to be notified about — changes save instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {((() => {
                  const approvedRoles = userRoles
                    .filter((r) => (r.approval_status || "").toLowerCase() === "approved")
                    .map((r) => (r.role || "").toLowerCase());
                  const isHost = approvedRoles.includes("host");
                  const isCleaner = approvedRoles.includes("cleaner");

                  const allOptions = [
                    {
                      field: "bookings",
                      label: "Booking Notifications",
                      desc: isHost
                        ? "New booking requests, confirmations, cancellations, and guest check-ins"
                        : "Your booking confirmations, cancellations, and upcoming trip reminders",
                      show: true,
                    },
                    {
                      field: "messages",
                      label: "Message Notifications",
                      desc: isHost
                        ? "New messages from guests or cleaners"
                        : isCleaner
                        ? "New messages from hosts"
                        : "New messages from your hosts",
                      show: true,
                    },
                    {
                      field: "jobs",
                      label: "Cleaning Job Updates",
                      desc: isHost
                        ? "Cleaner acceptances, declines, and job completion updates"
                        : "New job assignments, schedule changes, and completion confirmations",
                      show: isHost || isCleaner,
                    },
                    {
                      field: "payments",
                      label: "Payment Alerts",
                      desc: isHost
                        ? "Payout confirmations, balance releases, and upcoming payment reminders"
                        : "Payment confirmations and upcoming balance due reminders",
                      show: true,
                    },
                    {
                      field: "marketing",
                      label: "Marketing Emails",
                      desc: "Tips, news, and special offers from HostKeep",
                      show: true,
                    },
                  ];

                  return allOptions.filter((o) => o.show);
                })()).map(({ field, label, desc }) => (
                  <div key={field} className="flex items-center justify-between py-1">
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
                  <CardDescription>Connect your Stripe account to receive payments</CardDescription>
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
                          <p className="text-sm text-gray-600">Your account is verified and ready to receive payments.</p>
                        </>
                      )}
                      {stripeState === "B" && (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Verification Incomplete
                          </Badge>
                          <p className="text-sm text-gray-600">Your Stripe account is connected but needs additional verification.</p>
                          <Button onClick={handleStripeConnect} disabled={stripeLoading} className="bg-teal-600 hover:bg-teal-700">
                            {stripeLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</> : "Complete Verification"}
                          </Button>
                        </>
                      )}
                      {stripeState === "A" && (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Not Connected
                          </Badge>
                          <Button onClick={handleStripeConnect} disabled={stripeLoading} className="bg-teal-600 hover:bg-teal-700">
                            {stripeLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : "Connect with Stripe"}
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

        <div className="mt-10 border border-red-200 rounded-xl p-6 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-1 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-sm text-red-600 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={handleDeletePreCheck}>Delete Account</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>

          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}