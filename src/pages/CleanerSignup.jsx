import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Star, Upload, DollarSign, Calendar,
  Award, CheckCircle, Sparkles,
  Clock, AlertCircle, Target
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { addUserRole, getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import { useAuth } from "@/lib/AuthContext";

export default function CleanerSignup() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    display_name: "",
    service_area_city: "",
    service_area_postcode: "",
    experience_level: "intermediate",
    bio: "",
    profile_photo: "",
    work_photos: [],
    certifications: "",
    holiday_let_experience: "",
    base_price: "",
    minimum_charge: "",
    optional_services: {
      laundry: false,
      linen_changes: false,
      deep_cleaning: false
    },
    availability_mode: "flexible",
    preferred_days: [],
    time_windows: [],
    auto_accept_enabled: false,
    auto_accept_price_range: { min: 0, max: 0 },
    auto_accept_radius: false,
    max_jobs_per_day: 3,
    travel_radius: 10,
    subscription_plan: "basic"
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handlePhotoUpload = async (e, type = "profile") => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === "profile") {
        handleChange("profile_photo", file_url);
      } else {
        handleChange("work_photos", [...formData.work_photos, file_url]);
      }
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    }
  };

  const toggleDay = (day) => {
    const days = formData.preferred_days.includes(day)
      ? formData.preferred_days.filter(d => d !== day)
      : [...formData.preferred_days, day];
    handleChange("preferred_days", days);
  };

  const addTimeWindow = (preset) => {
    const windows = {
      morning: { start: "08:00", end: "12:00", label: "Morning Turnover" },
      afternoon: { start: "12:00", end: "17:00", label: "Afternoon Turnover" }
    };
    handleChange("time_windows", [...formData.time_windows, windows[preset]]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Custom auth only
      if (!isAuthenticated || !user) {
        toast.info("Please sign in first");
        navigate("/SignIn");
        return;
      }

      const cleaner = await base44.entities.Cleaner.create({
        user_id: user.id,
        business_name: formData.display_name,
        bio: formData.bio,
        profile_photo: formData.profile_photo,
        portfolio_photos: formData.work_photos,
        service_area: {
          city: formData.service_area_city,
          postcode_prefix: formData.service_area_postcode,
          radius_miles: formData.travel_radius
        },
        base_price: parseFloat(formData.base_price),
        minimum_charge: parseFloat(formData.minimum_charge),
        subscription_plan: formData.subscription_plan,
        subscription_status: "trial",
        subscription_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        auto_accept_jobs: formData.auto_accept_enabled,
        max_jobs_per_day: formData.max_jobs_per_day
      });

      // Assign roles
      const roles = await getUserRoles(user.id);
      if (!hasRole(roles, "guest")) await addUserRole(user.id, "guest");
      if (!hasRole(roles, "cleaner")) await addUserRole(user.id, "cleaner");

      toast.success("Welcome to CleanKeep! Your 30‑day trial has started.");
      setTimeout(() => navigate(createPageUrl("CleanerDashboard")), 800);

    } catch (error) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const showUpgradeMessage = formData.subscription_plan === "basic";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HERO SECTION */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Join CleanKeep</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Earn More Cleaning Holiday Homes<br />Across the UK
          </h1>

          <p className="text-xl text-gray-600 mb-6">
            Create your professional cleaning profile in minutes.<br />
            Connect with verified holiday home owners who need reliable cleaners.
          </p>

          <Button
            onClick={() =>
              document.getElementById("profile-section").scrollIntoView({ behavior: "smooth" })
            }
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 h-auto"
          >
            Complete Your Profile — Start Free
          </Button>
        </div>

        {/* WHY CLEANKEEP */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6 text-blue-600" />
              Why Professional Cleaners Choose CleanKeep
            </CardTitle>
          </CardHeader>

          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Keep 100% of your earnings</div>
                <div className="text-sm text-gray-600">No commission fees on bookings</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Build trusted reputation</div>
                <div className="text-sm text-gray-600">Reviews and verified badges</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Direct host matching</div>
                <div className="text-sm text-gray-600">No middlemen or agencies</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Control your schedule</div>
                <div className="text-sm text-gray-600">Set your availability and pricing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* PROFILE SECTION */}
          <Card id="profile-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">👤</span>
                Professional Profile
              </CardTitle>
              <CardDescription className="text-base">
                Add what helps hosts trust you.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">

              {/* NAME + EXPERIENCE */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Display Name *</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => handleChange("display_name", e.target.value)}
                    placeholder="e.g., Sarah's Cleaning Services"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Experience Level *</Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(v) => handleChange("experience_level", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0–1 year)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (1–3 years)</SelectItem>
                      <SelectItem value="experienced">Experienced (3–5 years)</SelectItem>
                      <SelectItem value="expert">Expert (5+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* LOCATION */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Location / Service Area *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={formData.service_area_city}
                      onChange={(e) => handleChange("service_area_city", e.target.value)}
                      placeholder="City"
                      required
                      className="flex-1"
                    />
                    <Input
                      value={formData.service_area_postcode}
                      onChange={(e) => handleChange("service_area_postcode", e.target.value)}
                      placeholder="Postcode"
                      required
                      className="w-32"
                    />
                  </div>
                </div>
              </div>

              {/* BIO */}
              <div>
                <Label>Short Professional Bio *</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Tell hosts about your experience, approach to cleaning, and what makes you reliable..."
                  rows={4}
                  required
                  className="mt-1"
                />
              </div>

              {/* OPTIONAL DETAILS */}
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-3 block">
                  Optional (Highly Recommended)
                </Label>

                <div className="space-y-4">

                  {/* PROFILE PHOTO */}
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="flex items-center gap-4 mt-1">
                      {formData.profile_photo && (
                        <img
                          src={formData.profile_photo}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Upload Photo</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, "profile")}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* WORK PHOTOS */}
                  <div>
                    <Label>Work Photos (Portfolio)</Label>
                    <label className="cursor-pointer block mt-1">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-300">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Upload before/after photos of your work
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, "work")}
                        className="hidden"
                      />
                    </label>

                    {formData.work_photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {formData.work_photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Work ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CERTIFICATIONS */}
                  <div>
                    <Label>Certification Badges</Label>
                    <Input
                      value={formData.certifications}
                      onChange={(e) => handleChange("certifications", e.target.value)}
                      placeholder="e.g., DBS checked, Fully insured"
                      className="mt-1"
                    />
                  </div>

                  {/* HOLIDAY LET EXPERIENCE */}
                  <div>
                    <Label>Holiday Let Experience Notes</Label>
                    <Textarea
                      value={formData.holiday_let_experience}
                      onChange={(e) => handleChange("holiday_let_experience", e.target.value)}
                      placeholder="Describe your experience with holiday home turnovers..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Profiles with photos and experience details receive more job requests.
                </div>
              </div>
            </CardContent>
          </Card>
{/* PRICING */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-2xl">
      <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">💰</span>
      Your Pricing
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <Label>Base Price (£) *</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.base_price}
          onChange={(e) => handleChange("base_price", e.target.value)}
          placeholder="75"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label>Minimum Charge (£) *</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.minimum_charge}
          onChange={(e) => handleChange("minimum_charge", e.target.value)}
          placeholder="50"
          required
          className="mt-1"
        />
      </div>
    </div>

    <div>
      <Label className="text-base font-semibold mb-3 block">
        Add Optional Services
      </Label>

      <div className="space-y-2">
        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <Checkbox
            checked={formData.optional_services.laundry}
            onCheckedChange={(v) =>
              handleNestedChange("optional_services", "laundry", v)
            }
          />
          <span>Laundry</span>
        </label>

        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <Checkbox
            checked={formData.optional_services.linen_changes}
            onCheckedChange={(v) =>
              handleNestedChange("optional_services", "linen_changes", v)
            }
          />
          <span>Linen Changes</span>
        </label>

        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <Checkbox
            checked={formData.optional_services.deep_cleaning}
            onCheckedChange={(v) =>
              handleNestedChange("optional_services", "deep_cleaning", v)
            }
          />
          <span>Deep Cleaning</span>
        </label>
      </div>
    </div>
  </CardContent>
</Card>

{/* SMART AVAILABILITY */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-2xl">
      <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">📅</span>
      Smart Availability
    </CardTitle>
    <CardDescription>Choose how you want to work</CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="space-y-3">

      {/* ACTIVE MODE */}
      <label
        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
          formData.availability_mode === "active"
            ? "border-green-500 bg-green-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="radio"
          name="availability_mode"
          value="active"
          checked={formData.availability_mode === "active"}
          onChange={(e) => handleChange("availability_mode", e.target.value)}
          className="mt-1"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-semibold text-lg">Active Mode</span>
            <Badge className="bg-green-100 text-green-700">Recommended</Badge>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            You are actively looking for work
          </p>

          {formData.availability_mode === "active" && (
            <div className="space-y-4 mt-4 pt-4 border-t">

              {/* DAYS */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Preferred Working Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={
                          formData.preferred_days.includes(day)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleDay(day)}
                        className={
                          formData.preferred_days.includes(day)
                            ? "bg-green-600"
                            : ""
                        }
                      >
                        {day}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* TIME WINDOWS */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Time Windows
                </Label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeWindow("morning")}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Morning Turnover (08:00–12:00)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeWindow("afternoon")}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Afternoon Turnover (12:00–17:00)
                  </Button>
                </div>

                {formData.time_windows.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.time_windows.map((window, idx) => (
                      <Badge key={idx} variant="outline" className="bg-green-50">
                        {window.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </label>

      {/* FLEXIBLE MODE */}
      <label
        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
          formData.availability_mode === "flexible"
            ? "border-yellow-500 bg-yellow-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="radio"
          name="availability_mode"
          value="flexible"
          checked={formData.availability_mode === "flexible"}
          onChange={(e) => handleChange("availability_mode", e.target.value)}
          className="mt-1"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="font-semibold text-lg">Flexible Mode</span>
            <Badge className="bg-yellow-100 text-yellow-700">
              ⭐ Most Popular
            </Badge>
          </div>

          <p className="text-sm text-gray-600 mb-1">
            Best for earning more without burnout
          </p>
          <p className="text-sm text-gray-700">
            • Receive job requests<br />• Accept or decline before booking is
            confirmed
          </p>
        </div>
      </label>

      {/* UNAVAILABLE MODE */}
      <label
        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
          formData.availability_mode === "unavailable"
            ? "border-red-500 bg-red-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          type="radio"
          name="availability_mode"
          value="unavailable"
          checked={formData.availability_mode === "unavailable"}
          onChange={(e) => handleChange("availability_mode", e.target.value)}
          className="mt-1"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-semibold text-lg">Unavailable Mode</span>
          </div>

          <p className="text-sm text-gray-600">
            Block personal time or holidays
          </p>
        </div>
      </label>
    </div>

    {formData.availability_mode === "flexible" && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-900">
          <strong>💡 Soft Conversion Message:</strong> 68% of top-rated
          cleaners use Flexible Mode.
        </div>
      </div>
    )}
  </CardContent>
</Card>

{/* AUTOMATION */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-2xl">
      <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm">
        🤖
      </span>
      Automation & Smart Matching
    </CardTitle>
    <CardDescription>Set job automation rules</CardDescription>
  </CardHeader>

  <CardContent className="space-y-6">
    <div className="space-y-4">

      {/* AUTO ACCEPT PRICE */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label className="text-base font-medium">
            Auto-accept jobs within price range
          </Label>
          <p className="text-sm text-gray-500">
            Automatically accept jobs that match your criteria
          </p>
        </div>
        <Switch
          checked={formData.auto_accept_enabled}
          onCheckedChange={(v) => handleChange("auto_accept_enabled", v)}
        />
      </div>

      {/* AUTO ACCEPT RADIUS */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label className="text-base font-medium">
            Auto-accept jobs within travel radius
          </Label>
          <p className="text-sm text-gray-500">
            Only auto-accept jobs within your service area
          </p>
        </div>
        <Switch
          checked={formData.auto_accept_radius}
          onCheckedChange={(v) => handleChange("auto_accept_radius", v)}
        />
      </div>

      {/* MAX JOBS PER DAY */}
      <div>
        <Label htmlFor="max_jobs">Maximum jobs per day</Label>
        <Input
          id="max_jobs"
          type="number"
          min="1"
          max="10"
          value={formData.max_jobs_per_day}
          onChange={(e) =>
            handleChange("max_jobs_per_day", parseInt(e.target.value))
          }
          className="mt-1"
        />
      </div>

      {/* TRAVEL RADIUS */}
      <div>
        <Label htmlFor="travel_radius">Travel Radius (miles)</Label>
        <Input
          id="travel_radius"
          type="number"
          min="1"
          max="50"
          value={formData.travel_radius}
          onChange={(e) =>
            handleChange("travel_radius", parseInt(e.target.value))
          }
          className="mt-1"
        />
      </div>
    </div>
  </CardContent>
</Card>

{/* SUBSCRIPTION */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-2xl">
      <span className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm">
        ⭐
      </span>
      Subscription Plan
    </CardTitle>
    <CardDescription>Choose your plan — upgrade anytime</CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* BASIC */}
    <label
      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
        formData.subscription_plan === "basic"
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name="subscription_plan"
        value="basic"
        checked={formData.subscription_plan === "basic"}
        onChange={(e) => handleChange("subscription_plan", e.target.value)}
        className="mt-1"
      />
      <div>
        <div className="font-semibold text-lg">Solo Basic — £9.99/mo</div>
        <p className="text-sm text-gray-600">
          Perfect for new cleaners starting out
        </p>
      </div>
    </label>

    {/* PRO */}
    <label
      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
        formData.subscription_plan === "pro"
          ? "border-amber-500 bg-amber-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name="subscription_plan"
        value="pro"
        checked={formData.subscription_plan === "pro"}
        onChange={(e) => handleChange("subscription_plan", e.target.value)}
        className="mt-1"
      />
      <div>
        <div className="font-semibold text-lg flex items-center gap-2">
          Solo Pro — £19.99/mo
          <Badge className="bg-amber-500">Popular</Badge>
        </div>
        <p className="text-sm text-gray-600">
          Priority placement, analytics, repeat client tools
        </p>
      </div>
    </label>
  </CardContent>
</Card>

{/* SUBMIT BUTTON */}
<div className="text-center pt-6">
  <Button
    type="submit"
    disabled={loading}
    className="bg-blue-600 hover:bg-blue-700 text-lg px-10 py-6 h-auto"
  >
    {loading ? "Creating Profile..." : "Create My Cleaner Profile"}
  </Button>
</div>

        </form>
      </div>
    </div>
  );
}