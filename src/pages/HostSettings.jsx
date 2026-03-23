import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bell, CreditCard, Upload, Loader2 } from "lucide-react";
import StripeConnectPanel from "@/components/host/StripeConnectPanel";
import { toast } from "sonner";

export default function HostSettings() {
  const [user, setUser] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location: "",
    profile_photo: "",
    notification_preferences: {
      email_bookings: true,
      email_messages: true,
      email_marketing: false,
    }
  });

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setFormData({
        full_name: userData.full_name || "",
        phone: userData.phone || "",
        bio: userData.bio || "",
        location: userData.location || "",
        profile_photo: userData.profile_photo || "",
        notification_preferences: userData.notification_preferences || {
          email_bookings: true,
          email_messages: true,
          email_marketing: false,
        }
      });
    }).catch(() => {});
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [field]: value
      }
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange("profile_photo", file_url);
    setIsUploading(false);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </motion.div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  This information will be visible to guests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={formData.profile_photo} />
                    <AvatarFallback className="bg-teal-100 text-teal-600 text-2xl">
                      {formData.full_name?.charAt(0)?.toUpperCase() || 'H'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload">
                      <Button variant="outline" asChild className="cursor-pointer">
                        <span>
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Change Photo
                        </span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">JPG or PNG, max 2MB</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => handleChange("full_name", e.target.value)}
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

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+44 7123 456789"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="e.g. London, UK"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>About You</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Tell guests about yourself..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Choose what emails you'd like to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Booking notifications</p>
                    <p className="text-sm text-gray-500">
                      New bookings, cancellations, and reminders
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.email_bookings}
                    onCheckedChange={(v) => handleNotificationChange("email_bookings", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Message notifications</p>
                    <p className="text-sm text-gray-500">
                      New messages from guests
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.email_messages}
                    onCheckedChange={(v) => handleNotificationChange("email_messages", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Marketing emails</p>
                    <p className="text-sm text-gray-500">
                      Tips, news, and special offers
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.email_marketing}
                    onCheckedChange={(v) => handleNotificationChange("email_marketing", v)}
                  />
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <StripeConnectPanel user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}