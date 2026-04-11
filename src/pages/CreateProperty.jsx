import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MobileSelect from "@/components/MobileSelect";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  MapPin,
  Image,
  PoundSterling,
  Calendar,
  FileText,
  ChevronLeft,
  Upload,
  X,
  Check,
  Loader2,
  MoreVertical,
} from "lucide-react";
import DayBasedBookingRules from "@/components/properties/DayBasedBookingRules";
import PricingManager from "@/components/pricing/PricingManager";
import { toast } from "sonner";
import {
  addUserRole,
  getUserRoles,
  hasRole,
} from "@/components/utils/roleHelpers";
import LocationStep from "@/components/properties/LocationStep";
import AmenitiesSelector from "@/components/properties/AmenitiesSelector";
import { useAuth } from "@/lib/AuthContext";
import PolicyPickerDialog from "@/components/properties/PolicyPickerDialog";

import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

const STEPS = [
  { id: 1, title: "Basics", icon: Home },
  { id: 2, title: "Description", icon: FileText },
  { id: 3, title: "Location", icon: MapPin },
  { id: 4, title: "Photos", icon: Image },
  { id: 5, title: "Pricing", icon: PoundSterling },
  { id: 6, title: "Booking Rules", icon: Calendar },
  { id: 7, title: "Verification", icon: FileText },
];

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "bungalow", label: "Bungalow" },
  { value: "cabin", label: "Cabin" },
  { value: "caravan", label: "Caravan" },
  { value: "chalet", label: "Chalet" },
  { value: "house", label: "House" },
  { value: "lodges", label: "Lodges" },
];

export default function CreateProperty() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const formContentRef = useRef(null);
  const [foundingPostcode, setFoundingPostcode] = useState("");
  const [isBeta, setIsBeta] = useState(true); // default true until fetched

  // Load founding member postcode if user is a founding member
  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch beta flag
    useEffect(() => {
      (async () => {
        try {
          const res = await base44.functions.invoke("getBetaSettings", {});
          if (res?.data?.beta_open !== undefined) {
            setIsBeta(res.data.beta_open);
          }
        } catch (_) {
          // default to true (beta on) if fetch fails
        }
      })();
    }, []);

    // First try signup_postcode already on the user object from session
    if (user?.signup_postcode) {
      setFoundingPostcode(user.signup_postcode);
      return;
    }

    // Fallback — fetch directly from FoundingMember via session token
    if (!user?.founding_member_id) return;
    (async () => {
      try {
        const sessionToken = localStorage.getItem("session_token");
        const res = await base44.functions.invoke("getUserFromSession", { session_token: sessionToken });
        const postcode = res?.data?.user?.postcode;
        if (postcode) setFoundingPostcode(postcode);
      } catch (_) {
        // not a founding member, continue without locked postcode
      }
    })();
  }, [isAuthenticated, user?.founding_member_id, user?.signup_postcode]);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = createPageUrl("Home");
    }
  }, [isAuthenticated]);

  // Pre-entry subscription/capacity gate
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const BETA_PLANS = ['beta_host_access', 'beta_cleaner_access'];
    const FOUNDING_CAPACITY = {
      founding_host_solo: 1,
      founding_host_multi: 5,
      founding_host_portfolio: 999,
    };

    (async () => {
      const [subs, existingProps] = await Promise.all([
        base44.entities.Subscription.filter({ user_id: user.id }),
        base44.entities.Property.filter({ owner_id: user.id }),
      ]);

      const sub = subs[0];
      const propCount = existingProps.length;
      const isBeta = sub && BETA_PLANS.includes(sub.plan) && sub.status === 'active';

      // No subscription: allow through, will be prompted after
      if (!sub || sub.status !== 'active') return;

      // Beta user: no next_subscription chosen yet — allow through, will be prompted after
      if (isBeta && !sub.next_subscription) return;

      // Beta user: check founding plan capacity before allowing new property
      if (isBeta && sub.next_subscription) {
        const maxProps = FOUNDING_CAPACITY[sub.next_subscription] ?? 999;
        if (propCount >= maxProps) {
          const upgrade = maxProps === 1 ? 'multi' : 'portfolio';
          window.location.href = `/Subscription?tab=host&upgrade=${upgrade}`;
        }
        return;
      }

      // Active non-beta: check capacity
      if (sub.plan === 'host_starter_monthly' && propCount >= 1) {
        window.location.href = '/Subscription?tab=host&upgrade=multi';
        return;
      }
      if (sub.plan === 'host_growth_monthly' && propCount >= 5) {
        window.location.href = '/Subscription?tab=host&upgrade=portfolio';
      }
    })();
  }, [isAuthenticated, user?.id]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const { data: policies } = useQuery({
    queryKey: ["cancellation-policies"],
    queryFn: () => base44.entities.CancellationPolicy.list(),
  });

  const [titleError, setTitleError] = useState("");
  const [locationData, setLocationData] = useState({});
  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState([]);
  const [smartLockPolicyWarning, setSmartLockPolicyWarning] = useState(null);
  const [showPolicyPicker, setShowPolicyPicker] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Ensure 4 standard policies exist on load
  useEffect(() => {
    const ensurePolicies = async () => {
      try {
        const existing = await base44.entities.CancellationPolicy.list();
        if (existing.length < 4) {
          const toCreate = [
            { policy_name: "Flexible", description: "Full refund if cancelled 30+ days before check-in. 50% refund if cancelled 7-29 days before.", tier_1_deadline_days: 30, tier_1_refund_percentage: 100, tier_2_deadline_days: 7, tier_2_refund_percentage: 50, final_tier_refund_percentage: 0 },
            { policy_name: "Moderate", description: "Full refund if cancelled 30+ days before check-in. 25% refund if cancelled 7-29 days before.", tier_1_deadline_days: 30, tier_1_refund_percentage: 100, tier_2_deadline_days: 7, tier_2_refund_percentage: 25, final_tier_refund_percentage: 0 },
            { policy_name: "Strict", description: "Full refund if cancelled 30+ days before. No refund if cancelled within 7 days.", tier_1_deadline_days: 30, tier_1_refund_percentage: 100, tier_2_deadline_days: 7, tier_2_refund_percentage: 0, final_tier_refund_percentage: 0 },
            { policy_name: "Super Strict", description: "Full refund only if cancelled 60+ days before. Non-refundable within 60 days.", tier_1_deadline_days: 60, tier_1_refund_percentage: 100, tier_2_deadline_days: 0, tier_2_refund_percentage: 0, final_tier_refund_percentage: 0 },
          ].slice(existing.length);
          await Promise.all(toCreate.map(p => base44.entities.CancellationPolicy.create(p)));
        }
      } catch (_) {
        // policies may already exist or creation may fail; continue anyway
      } finally {
        setIsInitializing(false);
      }
    };
    ensurePolicies();
  }, []);

  const validateTitle = (value) => {
    const invalidChars = value.replace(/[a-zA-Z0-9\s\-&!.]/g, "");
    if (invalidChars.length > 0) {
      return `Invalid characters: ${invalidChars.split("").join(" ")}`;
    }
    if (value.length > 0 && value.length < 16) {
      return `Title must be at least 16 characters`;
    }
    if (value.length > 50) {
      return `Title must be maximum 50 characters`;
    }
    return "";
  };

  const handleTitleChange = (value) => {
    setFormData((prev) => ({ ...prev, title: value }));
    setTitleError(validateTitle(value));
  };

  const [formData, setFormData] = useState({
    title: "",
    property_type: "apartment",
    guest_capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    location: {},
    photos: [],
    nightly_rate: 100,
    cleaning_fee: 50,
    security_deposit: 0,
    minimum_stay: 1,
    description: "",
    amenities: [],
    house_rules: "",
    pets_allowed: false,
    smoking_allowed: false,
    children_allowed: false,
    minimum_child_age: null,
    check_in_time: "15:00",
    check_out_time: "10:00",
    day_based_restrictions_enabled: false,
    booking_rules: {},
    cancellation_policy_id: "",
    cleaning_fee_refundable: true,
    pricing_settings: {
      base_rate: 100,
      price_rounding: null,
      weekday_rate: null,
      weekend_rate: null,
      seasons: [],
      date_overrides: {},
    },
    status: "draft",
    existing_listing_url: "",
    verification_document: null,

    smart_lock_enabled: false,
    smart_lock_code: "",
    smart_lock_send_hours: null,
  });

  useEffect(() => {
    if (formContentRef.current) {
      formContentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentStep]);

  // Reset smart lock if cancellation policy makes current timing unsafe
  useEffect(() => {
    if (!formData.smart_lock_enabled) return;
    if (!policies || !formData.cancellation_policy_id) return;

    const policy = policies.find(p => p.id === formData.cancellation_policy_id);
    if (!policy) return;

    const cancellationHoursBefore = (policy.tier_1_deadline_days ?? 0) * 24;
    const maxAllowedHours = Math.max(cancellationHoursBefore - 12, 0);

    if (formData.smart_lock_send_hours && formData.smart_lock_send_hours > maxAllowedHours) {
      setFormData(prev => ({ ...prev, smart_lock_send_hours: null }));
      setSmartLockPolicyWarning("Your cancellation policy is shorter than your selected send time — auto-send timing has been reset.");
    } else {
      setSmartLockPolicyWarning(null);
    }
  }, [
    formData.cancellation_policy_id,
    formData.smart_lock_send_hours,
    formData.smart_lock_enabled,
    policies,
  ]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const property = await base44.entities.Property.create({
        ...data,
        owner_id: user?.id,
      });

      if (user?.id) {
        try {
          const roles = await getUserRoles(user.id);
          if (!hasRole(roles, "guest")) await addUserRole(user.id, "guest");
          if (!hasRole(roles, "host")) await addUserRole(user.id, "host");
        } catch (e) {
          console.warn("Role assignment skipped:", e);
        }
      }

      return property;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(["properties"]);
      toast.success("Property created!");

      try {
        const BETA_PLANS = ['beta_host_access', 'beta_cleaner_access'];
        const FOUNDING_CAPACITY = {
          founding_host_solo: 1,
          founding_host_multi: 5,
          founding_host_portfolio: 999,
        };

        const [subs, allProps] = await Promise.all([
          base44.entities.Subscription.filter({ user_id: user?.id }),
          base44.entities.Property.filter({ owner_id: user?.id }),
        ]);

        const sub = subs[0];
        const propCount = allProps.length;
        const isBeta = sub && BETA_PLANS.includes(sub.plan) && sub.status === 'active';
        const hasActiveSub = sub && sub.status === 'active' && !isBeta;

        // No subscription at all
        if (!sub || sub.status !== 'active') {
          window.location.href = '/Subscription?tab=host&reason=new_property';
          return;
        }

        // Beta user: must have chosen a next_subscription
        if (isBeta && !sub.next_subscription) {
          window.location.href = '/Subscription?tab=host&reason=new_property';
          return;
        }

        // Beta user: check their chosen founding plan capacity
        if (isBeta && sub.next_subscription) {
          const maxProps = FOUNDING_CAPACITY[sub.next_subscription] ?? 999;
          if (propCount > maxProps) {
            const upgrade = maxProps === 1 ? 'multi' : 'portfolio';
            window.location.href = `/Subscription?tab=host&upgrade=${upgrade}`;
            return;
          }
        }

        // Active non-beta subscription capacity checks
        if (hasActiveSub) {
          if (sub.plan === 'host_starter_monthly' && propCount >= 2) {
            window.location.href = '/Subscription?tab=host&upgrade=multi';
            return;
          }
          if (sub.plan === 'host_growth_monthly' && propCount >= 6) {
            window.location.href = '/Subscription?tab=host&upgrade=portfolio';
            return;
          }
        }

        // All good
        window.location.href = createPageUrl("HostProperties");
      } catch {
        window.location.href = createPageUrl("HostProperties");
      }
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (slug) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(slug)
        ? prev.amenities.filter((a) => a !== slug)
        : [...prev.amenities, slug],
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newIdentifiers = files.map(
      (f) => `${f.name}-${f.size}-${f.lastModified}`
    );

    const duplicateFiles = [];
    newIdentifiers.forEach((identifier, idx) => {
      if (uploadedFileIdentifiers.includes(identifier)) {
        duplicateFiles.push(files[idx].name);
      }
    });

    if (duplicateFiles.length > 0) {
      toast.error(`Duplicate file(s): ${duplicateFiles.join(", ")}`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...uploadedUrls],
    }));

    setUploadedFileIdentifiers((prev) => [...prev, ...newIdentifiers]);
    setIsUploading(false);
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    setUploadedFileIdentifiers((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const setCoverPhoto = (idx) => {
    const newPhotos = [...formData.photos];
    [newPhotos[0], newPhotos[idx]] = [newPhotos[idx], newPhotos[0]];
    setFormData((prev) => ({ ...prev, photos: newPhotos }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.title.length >= 16 &&
          formData.title.length <= 50 &&
          !titleError
        );
      case 2:
        return formData.description.length >= 50;
      case 3:
         return !!(formData.postcode && formData.location?.street);
      case 4:
        return formData.photos.length >= 5;
      case 5:
        return formData.nightly_rate > 0;
      case 6:
        return !!formData.cancellation_policy_id;
      case 7:
        return (
          formData.existing_listing_url.trim().length > 0 ||
          formData.verification_document !== null
        );
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (formData.deposit_enabled && (!formData.deposit_value || formData.deposit_value < 1)) {
      toast.error("A minimum booking deposit of £1 is required to process guest payments securely");
      return;
    }
    createMutation.mutate({
      ...formData,
      ...locationData,
      status: "draft",
    });
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {STEPS.length}
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  step.id === currentStep
                    ? "text-teal-600"
                    : step.id < currentStep
                    ? "text-teal-500"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.id === currentStep
                      ? "bg-teal-100"
                      : step.id < currentStep
                      ? "bg-teal-50"
                      : "bg-gray-100"
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs hidden md:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div ref={formContentRef} className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Basics</CardTitle>
                  <CardDescription>
                    Let's start with the essentials
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <Label>Property Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Seaside Cottage!"
                      className={`mt-1 ${
                        titleError ? "border-red-500" : ""
                      }`}
                      maxLength={50}
                    />
                    <div className="flex justify-between mt-1">
                      <p
                        className={`text-sm ${
                          titleError ? "text-red-500" : "text-gray-400"
                        }`}
                      >
                        {titleError || "16–50 characters"}
                      </p>
                      <span className="text-sm text-gray-400">
                        {formData.title.length}/50
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Property Type</Label>
                    <MobileSelect
                      value={formData.property_type}
                      onValueChange={(v) => handleChange("property_type", v)}
                      placeholder="Property Type"
                      options={PROPERTY_TYPES}
                      triggerClassName="mt-1 w-full"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Guests</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.guest_capacity}
                        onChange={(e) =>
                          handleChange(
                            "guest_capacity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) =>
                          handleChange(
                            "bedrooms",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.bathrooms}
                        onChange={(e) =>
                          handleChange(
                            "bathrooms",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Description & Amenities */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Description & Amenities</CardTitle>
                  <CardDescription>
                    Tell guests what makes your place special
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <Label>Property Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      placeholder="Describe your property..."
                      rows={6}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      {formData.description.length}/50 characters minimum
                    </p>
                  </div>

                  <div>
                    <Label>House Rules (optional)</Label>
                    <Textarea
                      value={formData.house_rules}
                      onChange={(e) =>
                        handleChange("house_rules", e.target.value)
                      }
                      placeholder="Any specific rules..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.pets_allowed}
                        onCheckedChange={(v) =>
                          handleChange("pets_allowed", v)
                        }
                      />
                      <span>Pets allowed</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.smoking_allowed}
                        onCheckedChange={(v) =>
                          handleChange("smoking_allowed", v)
                        }
                      />
                      <span>Smoking allowed</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.children_allowed}
                        onCheckedChange={(v) => {
                          handleChange("children_allowed", v);
                          if (!v) handleChange("minimum_child_age", null);
                          else handleChange("minimum_child_age", 0);
                        }}
                      />
                      <span>Children allowed</span>
                    </label>
                  </div>

                  {formData.children_allowed && (
                    <div className="mt-4">
                      <Label>Minimum Child Age</Label>
                      <Input
                        type="number"
                        min="0"
                        max="17"
                        value={formData.minimum_child_age ?? 0}
                        onChange={(e) =>
                          handleChange(
                            "minimum_child_age",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="mt-1 w-32"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Children below this age are not permitted
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="mb-3 block">Amenities</Label>
                    <AmenitiesSelector
                      amenities={formData.amenities}
                      onChange={(val) => handleChange("amenities", val)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
            <LocationStep
              formData={formData}
              onFormChange={(field, value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
              onLocationChange={setLocationData}
              signupPostcode={foundingPostcode}
              isBeta={isBeta}
            />
            )}

            {/* Step 4: Photos */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                  <CardDescription>
                    Upload at least 5 photos to showcase your property
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-300 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      {isUploading ? (
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-teal-600 animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      )}
                      <p className="text-gray-600 font-medium">
                        {isUploading ? "Uploading..." : "Click to upload photos"}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        PNG, JPG up to 10MB each
                      </p>
                    </label>
                  </div>

                  {formData.photos.length < 5 && (
                    <p className="text-sm mt-2 text-red-500">
                      {formData.photos.length} / 5 photos uploaded (minimum 5
                      required)
                    </p>
                  )}

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {formData.photos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative group aspect-square cursor-move"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("photoIndex", idx.toString());
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const sourceIdx = parseInt(
                              e.dataTransfer.getData("photoIndex")
                            );
                            if (sourceIdx === idx) return;

                            const newPhotos = [...formData.photos];
                            const [moved] = newPhotos.splice(sourceIdx, 1);
                            newPhotos.splice(idx, 0, moved);

                            setFormData((prev) => ({
                              ...prev,
                              photos: newPhotos,
                            }));
                          }}
                        >
                          <img
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg pointer-events-none"
                          />

                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 bg-black/70 text-white rounded flex items-center justify-center hover:bg-black/90 transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                {idx !== 0 && (
                                  <DropdownMenuItem
                                    onClick={() => setCoverPhoto(idx)}
                                  >
                                    Make Cover Photo
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => removePhoto(idx)}
                                  className="text-red-600"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {idx === 0 && (
                            <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 5: Pricing */}
            {currentStep === 5 && (
              <PricingManager
                formData={formData}
                onUpdate={(field, value) => handleChange(field, value)}
              />
            )}

            {/* Step 6: Booking Rules + Smart Lock */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cancellation Policy</CardTitle>
                    <CardDescription>Select the cancellation policy for this property.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Policy Type <span className="text-red-500">*</span></Label>
                      {formData.cancellation_policy_id ? (
                        <button
                          type="button"
                          onClick={() => setShowPolicyPicker(true)}
                          className="mt-1 w-full text-left p-4 rounded-xl border-2 border-teal-500 bg-teal-50 hover:bg-teal-100 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-teal-700">
                              {policies?.find(p => p.id === formData.cancellation_policy_id)?.policy_name}
                            </p>
                            <span className="text-xs text-teal-600 font-medium">Change</span>
                          </div>
                          {policies?.find(p => p.id === formData.cancellation_policy_id)?.description && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {policies?.find(p => p.id === formData.cancellation_policy_id)?.description}
                            </p>
                          )}
                          {policies?.find(p => p.id === formData.cancellation_policy_id)?.policy_name === "Super Strict" && (
                            <p className="text-xs text-rose-600 mt-1">⚠️ May reduce booking conversions.</p>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPolicyPicker(true)}
                          className="mt-1 w-full text-left p-4 rounded-xl border-2 border-dashed border-red-300 bg-white hover:bg-gray-50 transition-all"
                        >
                          <p className="text-sm text-gray-400">Click to select a cancellation policy...</p>
                          <p className="text-xs text-red-500 mt-0.5">Required</p>
                        </button>
                      )}
                      <PolicyPickerDialog
                        open={showPolicyPicker}
                        onOpenChange={setShowPolicyPicker}
                        policies={policies || []}
                        value={formData.cancellation_policy_id}
                        onChange={(val) => {
                          const policy = policies?.find(p => p.id === val);
                          const isStrict = policy?.policy_name?.includes("Strict");
                          setFormData(prev => ({
                            ...prev,
                            cancellation_policy_id: val,
                            cleaning_fee_refundable: !isStrict,
                          }));
                        }}
                        title="Select Cancellation Policy"
                        confirmLabel="Select Policy"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={formData.cleaning_fee_refundable}
                        onCheckedChange={(val) => handleChange("cleaning_fee_refundable", val)}
                        id="clean-refund-new"
                      />
                      <Label htmlFor="clean-refund-new" className="font-normal cursor-pointer">Refund cleaning fee if guest cancels before check-in</Label>
                    </div>
                  </CardContent>
                </Card>
               
                <Card>
                  <CardHeader>
                    <CardTitle>Smart Lock Automation</CardTitle>
                    <CardDescription>
                      If your property has a smart lock, enter the guest access code below. Guests will use this to gain entry to your property. You can optionally enable automatic delivery of this code before check‑in.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Smart Lock Code</Label>
                      <Input
                        value={formData.smart_lock_code}
                        onChange={(e) => handleChange("smart_lock_code", e.target.value)}
                        placeholder="e.g. 4829# or app-generated code"
                        className="mt-1"
                      />
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.smart_lock_enabled}
                          disabled={!formData.cancellation_policy_id}
                          onCheckedChange={(v) => {
                            if (!v) {
                              handleChange("smart_lock_send_hours", null);
                              setSmartLockPolicyWarning(null);
                              toast.info("Auto-send timing has been cleared.");
                            }
                            handleChange("smart_lock_enabled", v);
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            Enable smart lock automation
                            {!formData.cancellation_policy_id && (
                              <span className="text-gray-400 font-normal"> (select a cancellation policy first)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Automatically send your smart lock code to guests before check‑in. The system will never send the code while the guest can still cancel.
                          </p>
                        </div>
                      </label>
                      {formData.smart_lock_enabled && (
                        <div className="mt-4 pl-6 space-y-2">
                          <Label>Auto-send timing</Label>
                          <select
                            value={formData.smart_lock_send_hours ?? ""}
                            onChange={(e) => handleChange("smart_lock_send_hours", e.target.value ? parseInt(e.target.value) : null)}
                            className="mt-1 w-full border rounded-md p-2"
                          >
                            <option value="">Select timing</option>
                            {[24, 48, 72, 96, 120, 144, 168].map((hours) => {
                              const policy = policies?.find(p => p.id === formData.cancellation_policy_id);
                              const maxAllowed = policy ? Math.max((policy.tier_1_deadline_days ?? 0) * 24 - 12, 0) : 999;
                              const disabled = hours > maxAllowed;
                              return (
                                <option key={hours} value={hours} disabled={disabled}>
                                  {hours} Hours ({hours / 24} Day{hours > 24 ? "s" : ""}){disabled ? " — too early for selected policy" : ""}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Options unavailable due to your cancellation policy window are marked above.
                          </p>
                          {smartLockPolicyWarning && (
                            <p className="text-xs text-red-500 mt-1 font-medium">{smartLockPolicyWarning}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <DayBasedBookingRules
                  value={{ enabled: formData.day_based_restrictions_enabled, rules: formData.booking_rules }}
                  onChange={(data) => {
                    handleChange("day_based_restrictions_enabled", data.enabled);
                    handleChange("booking_rules", data.rules);
                  }}
                />
              </div>
            )}

            {/* Step 7: Verification */}
            {currentStep === 7 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification</CardTitle>
                  <CardDescription>
                    Provide proof of ownership or an existing listing link
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <Label>Existing Listing URL (optional)</Label>
                    <Input
                      value={formData.existing_listing_url}
                      onChange={(e) =>
                        handleChange("existing_listing_url", e.target.value)
                      }
                      placeholder="https://airbnb.com/..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Upload Verification Document</Label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const { file_url } =
                          await base44.integrations.Core.UploadFile({ file });

                        handleChange("verification_document", file_url);
                      }}
                      className="mt-2"
                    />

                    {formData.verification_document && (
                      <p className="text-sm text-teal-600 mt-2">
                        Document uploaded successfully
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.length ? (
            <Button
              disabled={!canProceed()}
              onClick={() => setCurrentStep((s) => s + 1)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={!canProceed() || createMutation.isPending}
              onClick={handleSubmit}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Submit Property
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}