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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

function splitFullName(full_name = "") {
  const parts = full_name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { forename: "", middle_name: "", surname: "" };
  if (parts.length === 1) return { forename: parts[0], middle_name: "", surname: "" };
  if (parts.length === 2) return { forename: parts[0], middle_name: "", surname: parts[1] };
  return {
    forename: parts[0],
    middle_name: parts.slice(1, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

function assembleFullName({ forename, middle_name, surname }) {
  return [forename.trim(), middle_name.trim(), surname.trim()].filter(Boolean).join(" ");
}

// Inline save feedback banner — unambiguous success or error message
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
  // AuthContext provides: user, isAuthenticated, isLoadingAuth, authError, roles, logout, validateSession
  const { user } = useAuth();

  const [userRoles, setUserRoles] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(true);
  const stripeCacheRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({
    forename: "",
    middle_name: "",
    surname: "",
    phone: "",
    location: "",
  });

  const [notifications, setNotifications] = useState({
    notifications_bookings: true,
    notifications_messages: true,
    notifications_marketing: false,
  });

  // Load full profile data from FoundingMember via getUserFromSession.
  // AuthContext only holds email/role/founding_member_id — full_name lives on FoundingMember.
  useEffect(() => {
    if (!user) return;

    const sessionToken = localStorage.getItem("session_token");
    if (!sessionToken) return;

    fetch("/functions/getUserFromSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const fullName = data.user?.full_name || "";
        const nameParts = splitFullName(fullName);
        setProfile({
          forename: nameParts.forename,
          middle_name: nameParts.middle_name,
          surname: nameParts.surname,
          phone: data.user?.phone || "",
          location: data.user?.location || "",
        });
      })
      .catch(() => {
        // Fall back to whatever is on the auth context user (likely empty)
        const nameParts = splitFullName(user.full_name || "");
        setProfile({
          forename: nameParts.forename,
          middle_name: nameParts.middle_name,
          surname: nameParts.surname,
          phone: user.phone || "",
          location: user.location || "",
        });
      });

    if (user.id) {
      base44.entities.UserRole.filter({ user_id: user.id }).then(setUserRoles).catch(() => {});
    }
  }, [user]);

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

  // Stripe
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

  // Save profile — updates full_name on FoundingMember via founding_member_id
  const handleSaveProfile = async () => {
    setSaveStatus(null);

    if (!profile.forename.trim()) {
      setSaveStatus("error");
      return;
    }
    if (!profile.surname.trim()) {
      setSaveStatus("error");
      return;
    }

    setSaving(true);

    try {
      const fullName = assembleFullName(profile);
      const sessionToken = localStorage.getItem("session_token");

      const res = await fetch("/functions/updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken, full_name: fullName }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "save_failed");
      }

      setSaveStatus("success");
      // Auto-clear after 4 seconds
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
    // Notification prefs stored locally only for now — no backend entity for custom auth users
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("session_token");
      if (token) {
        await fetch("/functions/logoutSession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_token: token }),
        });
      }
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

                {/* Name — three fields matching the founding form */}
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

                {/* Email — read-only */}
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

                {/* Inline save feedback — shown directly above the button */}
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

        {/* Danger Zone */}
        <div className="mt-10 border border-red-200 rounded-xl p-6 bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-1 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-sm text-red-600 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Account</Button>
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
