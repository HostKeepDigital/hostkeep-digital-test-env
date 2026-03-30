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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/lib/AuthContext";

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

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = createPageUrl("Home");
    }
  }, [isAuthenticated]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const { data: policies } = useQuery({
    queryKey: ["cancellation-policies"],
    queryFn: () => base44.entities.CancellationPolicy.list(),
  });

  const [titleError, setTitleError] = useState("");
  const [locationData, setLocationData] = useState({});
  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState([]);

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
  });

  useEffect(() => {
    if (formContentRef.current) {
      formContentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentStep]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const property = await base44.entities.Property.create({
        ...data,
        owner_id: user?.id,
      });

      if (user?.id) {
        const roles = await getUserRoles(user.id);
        if (!hasRole(roles, "guest")) await addUserRole(user.id, "guest");
        if (!hasRole(roles, "host")) await addUserRole(user.id, "host");
      }

      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["properties"]);
      toast.success("Property created!");
      setTimeout(() => {
        window.location.href = createPageUrl("HostProperties");
      }, 800);
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
                  <CardDescription>Let's start with the essentials</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <Label>Property Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Seaside Cottage!"
                      className={`mt-1 ${titleError ? "border-red-500" : ""}`}
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
                    <Select
                      value={formData.property_type}
                      onValueChange={(v) => handleChange("property_type", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <CardDescription>Tell guests what makes your place special</CardDescription>
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

                  {/* NEW: Grouped Amenity Selector */}
                  <div>
                    <Label className="mb-3 block">Amenities</Label>

                    <div className="space-y-6">
                      {Object.entries(AMENITY_GROUPS).map(
                        ([groupName, slugs]) => (
                          <div key={groupName}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              {groupName}
                            </h4>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {slugs.map((slug) => {
                                const amenity = AMENITY_MAP[slug];
                                if (!amenity) return null;

                                return (
                                  <label
                                    key={slug}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={formData.amenities.includes(
                                        slug
                                      )}
                                      onCheckedChange={() =>
                                        toggleAmenity(slug)
                                      }
                                    />
                                    <span className="text-sm">
                                      {amenity.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
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
                      {formData.photos.length} / 5 photos uploaded (minimum 5 required)
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
                                  <DropdownMenuItem onClick={() => setCoverPhoto(idx)}>
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

            {/* Step 6: Booking Rules */}
            {currentStep === 6 && (
              <DayBasedBookingRules
                formData={formData}
                onUpdate={(field, value) => handleChange(field, value)}
              />
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
