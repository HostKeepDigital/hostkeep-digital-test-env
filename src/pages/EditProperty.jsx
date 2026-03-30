import { useState, useEffect, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Home,
  MapPin,
  Image,
  PoundSterling,
  FileText,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  Calendar,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DayBasedBookingRules from "@/components/properties/DayBasedBookingRules";
import PricingManager from "@/components/pricing/PricingManager";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { isEqual } from "lodash";
import { NavigationContext } from "../Layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LocationStep from "@/components/properties/LocationStep";

import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "cabin", label: "Cabin" },
  { value: "cottage", label: "Cottage" },
  { value: "bungalow", label: "Bungalow" },
];

export default function EditProperty() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");
  const defaultTab = urlParams.get("tab") || "basics";

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setNavBlocker = useContext(NavigationContext);

  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationData, setLocationData] = useState({
    location_id: null,
    lat: null,
    lng: null,
    normalized_name: null,
    slug: null,
  });

  const { data: policies } = useQuery({
    queryKey: ["cancellation-policies"],
    queryFn: () => base44.entities.CancellationPolicy.list(),
  });

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({
        id: propertyId,
      });
      return results[0];
    },
    enabled: !!propertyId,
  });

  useEffect(() => {
    if (property && !originalData) {
      const initial = {
        title: property.title || "",
        property_type: property.property_type || "house",
        guest_capacity: property.guest_capacity || 4,
        bedrooms: property.bedrooms || 2,
        bathrooms: property.bathrooms || 1,
        location: property.location || {
          street: "",
          locality: "",
          town_city: "",
          county: "",
          postcode: "",
        },
        postcode: property.postcode || "",
        postcode_district: property.postcode_district || "",
        postcode_area: property.postcode_area || "",
        county: property.county || "",
        town: property.town || "",
        country: property.country || "",
        latitude: property.latitude || null,
        longitude: property.longitude || null,
        photos: property.photos || [],
        nightly_rate: property.nightly_rate || 100,
        cleaning_fee: property.cleaning_fee || 0,
        security_deposit: property.security_deposit || 0,
        minimum_stay: property.minimum_stay || 1,
        deposit_enabled: property.deposit_enabled || false,
        deposit_type: property.deposit_type || "percentage",
        deposit_value: property.deposit_value || null,
        description: property.description || "",
        amenities: property.amenities || [],
        house_rules: property.house_rules || "",
        pets_allowed: property.pets_allowed || false,
        smoking_allowed: property.smoking_allowed || false,
        children_allowed: property.children_allowed || false,
        minimum_child_age: property.minimum_child_age ?? null,
        check_in_time: property.check_in_time || "15:00",
        check_out_time: property.check_out_time || "10:00",
        day_based_restrictions_enabled:
          property.day_based_restrictions_enabled || false,
        booking_rules: property.booking_rules || {},
        cancellation_policy_id: property.cancellation_policy_id || "",
        cleaning_fee_refundable: property.cleaning_fee_refundable !== false,
        pricing_settings: property.pricing_settings || {
          base_rate: property.nightly_rate || 100,
          price_rounding: null,
          weekday_rate: null,
          weekend_rate: null,
          seasons: [],
          date_overrides: {},
        },
        status: property.status || "draft",
      };

      setFormData(initial);
      setOriginalData(initial);

      if (property.location_id) {
        base44.entities.UKLocation.filter({
          id: property.location_id,
        }).then((locData) => {
          if (locData.length > 0) setSelectedLocation(locData[0]);
        });
      }
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.update(propertyId, data),
    onSuccess: (_, variables) => {
      toast.success("Property updated successfully!");
      setOriginalData((prev) => ({ ...prev, ...variables }));
      queryClient.invalidateQueries(["property", propertyId]);
      queryClient.invalidateQueries(["properties"]);
    },
  });

  const changedFields = [];
  if (originalData && formData) {
    Object.keys(formData).forEach((key) => {
      if (!isEqual(formData[key], originalData[key])) {
        changedFields.push(key);
      }
    });
  }
  const hasChanges = changedFields.length > 0;

  useEffect(() => {
    if (setNavBlocker) {
      if (hasChanges) {
        setNavBlocker(() => (path) => {
          setPendingAction(() => () => navigate(path));
          setShowUnsavedDialog(true);
        });
      } else {
        setNavBlocker(null);
      }
    }
    return () => {
      if (setNavBlocker) setNavBlocker(null);
    };
  }, [hasChanges]);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [pendingAction, setPendingAction] = useState(null);

  const formatFieldName = (field) => {
    const map = {
      title: "Property Title",
      property_type: "Property Type",
      guest_capacity: "Guest Capacity",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      location: "Location",
      photos: "Photos",
      nightly_rate: "Nightly Rate",
      cleaning_fee: "Cleaning Fee",
      security_deposit: "Security Deposit",
      minimum_stay: "Minimum Stay",
      deposit_enabled: "Booking Deposit Enabled",
      deposit_type: "Booking Deposit Type",
      deposit_value: "Booking Deposit Amount",
      description: "Description",
      amenities: "Amenities",
      house_rules: "House Rules",
      pets_allowed: "Pets Allowed",
      smoking_allowed: "Smoking Allowed",
      children_allowed: "Children Allowed",
      minimum_child_age: "Minimum Child Age",
      check_in_time: "Check-in Time",
      check_out_time: "Check-out Time",
      day_based_restrictions_enabled: "Day-based Restrictions",
      booking_rules: "Booking Rules",
      cancellation_policy_id: "Cancellation Policy",
      cleaning_fee_refundable: "Cleaning Fee Refundable",
      pricing_settings: "Pricing Settings",
      status: "Status",
    };
    return map[field] || field;
  };

  const handleBackClick = (e) => {
    e.preventDefault();
    if (hasChanges) {
      setPendingAction(() =>
        navigate(createPageUrl("HostProperties"))
      );
      setShowUnsavedDialog(true);
    } else {
      navigate(createPageUrl("HostProperties"));
    }
  };

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
      const { file_url } = await base44.integrations.Core.UploadFile({
        file,
      });
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

  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData("photoIndex", idx.toString());
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = parseInt(e.dataTransfer.getData("photoIndex"));
    if (sourceIdx === targetIdx) return;

    const newPhotos = [...formData.photos];
    const [moved] = newPhotos.splice(sourceIdx, 1);
    newPhotos.splice(targetIdx, 0, moved);

    setFormData((prev) => ({ ...prev, photos: newPhotos }));
  };

  const validateMandatoryFields = () => {
    const errorsByTab = {
      basics: [],
      details: [],
      location: [],
      photos: [],
      pricing: [],
      "booking-rules": [],
    };

    if (!formData.title || formData.title.length < 16) {
      errorsByTab.basics.push("Property title must be at least 16 characters");
    }

    if (!formData.description || formData.description.length < 50) {
      errorsByTab.details.push("Description must be at least 50 characters");
    }

    if (!formData.location?.street?.trim()) {
      errorsByTab.location.push("Street address is required");
    }
    if (!formData.location?.town_city?.trim()) {
      errorsByTab.location.push("Town/City is required");
    }
    if (!formData.location?.county?.trim()) {
      errorsByTab.location.push("County is required");
    }
    if (!formData.location?.postcode?.trim()) {
      errorsByTab.location.push("Postcode is required");
    }

    if (!formData.photos || formData.photos.length < 5) {
      errorsByTab.photos.push(
        `At least 5 photos required (currently: ${formData.photos?.length || 0})`
      );
    }

    if (!formData.nightly_rate || formData.nightly_rate <= 0) {
      errorsByTab.pricing.push("Nightly rate must be greater than £0");
    }

    if (!formData.cancellation_policy_id) {
      errorsByTab["booking-rules"].push("Cancellation policy is required");
    }

    return errorsByTab;
  };

  const handleSave = async (proceed) => {
    let currentFormData = { ...formData };

    if (
      currentFormData.deposit_enabled &&
      (!currentFormData.deposit_value || currentFormData.deposit_value === 0)
    ) {
      currentFormData.deposit_enabled = false;
      currentFormData.deposit_value = null;
    }

    const changedData = {};
    if (originalData) {
      Object.keys(currentFormData).forEach((key) => {
        if (!isEqual(currentFormData[key], originalData[key])) {
          changedData[key] = currentFormData[key];
        }
      });
    }

    if (locationData.location_id) changedData.location_id = locationData.location_id;
    if (locationData.lat !== null) changedData.lat = locationData.lat;
    if (locationData.lng !== null) changedData.lng = locationData.lng;
    if (locationData.normalized_name) changedData.normalized_name = locationData.normalized_name;
    if (locationData.slug) changedData.slug = locationData.slug;

    if (Object.keys(changedData).length === 0) {
      toast.info("No changes to save");
      if (typeof proceed === "function") proceed();
      return;
    }

    try {
      await updateMutation.mutateAsync(changedData);
      setFormData(currentFormData);
      if (typeof proceed === "function") proceed();
    } catch {
      toast.error("Failed to save changes");
    }
  };

  const handlePublish = async () => {
    const errorsByTab = validateMandatoryFields();
    const tabsWithErrors = Object.entries(errorsByTab).filter(
      ([_, errors]) => errors.length > 0
    );

    if (tabsWithErrors.length > 0) {
      setValidationErrors(errorsByTab);
      setShowValidationDialog(true);
      return;
    }

    try {
      await updateMutation.mutateAsync({ status: "published" });
      toast.success("Property published successfully!");
    } catch {
      toast.error("Failed to publish property");
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const tabNames = {
    basics: "Basics",
    details: "Description",
    location: "Location",
    photos: "Photos",
    pricing: "Pricing",
    "booking-rules": "Booking Rules",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Validation Dialog */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cannot Publish Property</DialogTitle>
            <DialogDescription>
              Please complete the following required fields:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {Object.entries(validationErrors)
              .filter(([_, errors]) => errors.length > 0)
              .map(([tab, errors]) => (
                <div
                  key={tab}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-red-900 mb-2">
                    {tabNames[tab]}
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowValidationDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <div className="text-sm text-gray-500 mt-2">
              <p>You have unsaved changes:</p>
              <ul className="list-disc pl-5 mt-2 mb-4 text-gray-700 font-medium">
                {changedFields.map((field) => (
                  <li key={field}>{formatFieldName(field)}</li>
                ))}
              </ul>
              <p>
                {pendingAction
                  ? "Save before leaving?"
                  : "Save these changes now?"}
              </p>
            </div>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormData(originalData);
                setShowUnsavedDialog(false);
                if (pendingAction) pendingAction();
              }}
            >
              Discard
            </Button>

            <Button
              onClick={async () => {
                await handleSave(() => {
                  setShowUnsavedDialog(false);
                  if (pendingAction) pendingAction();
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBackClick}>
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Edit Property
                </h1>
                <p className="text-sm text-gray-500">{formData.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {formData.status === "draft" && (
                <Button
                  onClick={handlePublish}
                  disabled={updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Property"
                  )}
                </Button>
              )}

              <Button
                onClick={handleSave}
                disabled={
                  updateMutation.isPending ||
                  formData.photos.length < 5 ||
                  !formData.cancellation_policy_id
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="basics">
              <Home className="w-4 h-4 mr-2" /> Basics
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-2" /> Description
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="w-4 h-4 mr-2" /> Location
            </TabsTrigger>
            <TabsTrigger value="photos">
              <Image className="w-4 h-4 mr-2" /> Photos
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <PoundSterling className="w-4 h-4 mr-2" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="booking-rules">
              <Calendar className="w-4 h-4 mr-2" /> Booking Rules
            </TabsTrigger>
          </TabsList>

          {/* BASICS TAB */}
          <TabsContent value="basics">
            <Card>
              <CardHeader>
                <CardTitle>Property Basics</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <Label>Property Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="mt-1"
                  />
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
                      value={formData.gest_capacity}
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

                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange("status", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOCATION TAB */}
          <TabsContent value="location">
            <LocationStep
              formData={formData}
              onFormChange={(field, value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
              onLocationChange={setLocationData}
            />
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
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
                  </label>
                </div>

                {formData.photos.length < 5 && (
                  <p className="text-sm text-red-500 mt-2">
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
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, idx)}
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
                                  Make this Picture your cover
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
          </TabsContent>

          {/* DETAILS TAB */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Description & Amenities</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    {formData.description.length}/50 characters minimum
                  </p>
                </div>

                {/* Grouped Amenities */}
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
                  <Label>House Rules</Label>
                  <Textarea
                    value={formData.house_rules}
                    onChange={(e) =>
                      handleChange("house_rules", e.target.value)
                    }
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
          </TabsContent>

          {/* PRICING TAB */}
          <TabsContent value="pricing">
            <PricingManager
              formData={formData}
              onUpdate={(field, value) => handleChange(field, value)}
            />
          </TabsContent>

          {/* BOOKING RULES TAB */}
          <TabsContent value="booking-rules">
            <DayBasedBookingRules
              formData={formData}
              onUpdate={(field, value) => handleChange(field, value)}
            />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Cancellation Policy</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <Label>Policy</Label>
                  <Select
                    value={formData.cancellation_policy_id}
                    onValueChange={(val) => {
                      const policy = policies?.find((p) => p.id === val);
                      const isStrict =
                        policy?.policy_name?.includes("Strict");

                      setFormData((prev) => ({
                        ...prev,
                        cancellation_policy_id: val,
                        cleaning_fee_refundable: !isStrict,
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a policy..." />
                    </SelectTrigger>

                    <SelectContent>
                      {policies?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.policy_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}