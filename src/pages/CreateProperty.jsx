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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Home, MapPin, Image, PoundSterling, Calendar, FileText, 
  ChevronLeft, ChevronRight, Upload, X, Check, Loader2, MoreVertical
} from "lucide-react";
import DayBasedBookingRules from "@/components/properties/DayBasedBookingRules";
import PricingManager from "@/components/pricing/PricingManager";
import { toast } from "sonner";
import { addUserRole, getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { validateLocationSelection, extractLocationData } from "@/components/LocationValidator";
import LocationStep from "@/components/properties/LocationStep";

const STEPS = [
  { id: 1, title: "Basics", icon: Home, description: "Property type and details" },
  { id: 2, title: "Description", icon: FileText, description: "Tell guests about your place" },
  { id: 3, title: "Location", icon: MapPin, description: "Where is your property?" },
  { id: 4, title: "Photos", icon: Image, description: "Show off your space" },
  { id: 5, title: "Pricing", icon: PoundSterling, description: "Set your rates" },
  { id: 6, title: "Booking Rules", icon: Calendar, description: "Day-based restrictions (optional)" },
  { id: 7, title: "Verification", icon: FileText, description: "Prove property ownership" },
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

const AMENITIES = [
  "WiFi", "Pool", "Parking", "Air Conditioning", "Kitchen", "Washing Machine",
  "TV", "Hot Tub", "Garden", "BBQ", "Gym", "Beach Access", "Fireplace",
  "Workspace", "Iron", "Hair Dryer", "Dishwasher", "Coffee Maker"
];

export default function CreateProperty() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const formContentRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: policies } = useQuery({
    queryKey: ['cancellation-policies'],
    queryFn: () => base44.entities.CancellationPolicy.list()
  });

  const [titleError, setTitleError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationData, setLocationData] = useState({
   location_id: null,
   lat: null,
   lng: null,
   normalized_name: null,
   slug: null
  });

  const validateTitle = (value) => {
    // Only allow letters, numbers, spaces, and - & ! .
    const invalidChars = value.replace(/[a-zA-Z0-9\s\-&!.]/g, '');
    if (invalidChars.length > 0) {
      return `Invalid characters: ${invalidChars.split('').join(' ')} (only - & ! . allowed)`;
    }
    if (value.length > 0 && value.length < 16) {
      return `Title must be at least 16 characters (${value.length}/16)`;
    }
    if (value.length > 50) {
      return `Title must be maximum 50 characters (${value.length}/50)`;
    }
    return "";
  };

  const handleTitleChange = (value) => {
    setFormData(prev => ({ ...prev, title: value }));
    setTitleError(validateTitle(value));
  };

  const [formData, setFormData] = useState({
    title: "",
    property_type: "apartment",
    guest_capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    location: {
      street: "",
      locality: "",
      town_city: "",
      county: "",
      postcode: ""
    },
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
      date_overrides: {}
    },
    status: "draft",
    existing_listing_url: "",
    verification_document: null,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = createPageUrl('Home');
    });
  }, []);

  useEffect(() => {
    // Scroll to form content when step changes
    if (formContentRef.current) {
      formContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const property = await base44.entities.Property.create({ ...data, owner_id: user?.id });
      
      // Add host role when property is created
      if (user?.id) {
        const roles = await getUserRoles(user.id);
        if (!hasRole(roles, 'guest')) {
          await addUserRole(user.id, 'guest');
        }
        if (!hasRole(roles, 'host')) {
          await addUserRole(user.id, 'host');
        }
      }
      
      return property;
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success("Property created successfully! You're now a host.");
      setTimeout(() => {
        window.location.href = createPageUrl('HostProperties');
      }, 1000);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setLocationError("");
    setFormData(prev => ({
      ...prev,
      location_id: location.id,
      location: {
        ...prev.location,
        county: location.name,
        country: location.country
      }
    }));
  };

  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState([]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check for duplicates before uploading
    const newIdentifiers = files.map(f => `${f.name}-${f.size}-${f.lastModified}`);
    const duplicateFiles = [];
    
    newIdentifiers.forEach((identifier, idx) => {
      if (uploadedFileIdentifiers.includes(identifier)) {
        duplicateFiles.push(files[idx].name);
      }
    });

    if (duplicateFiles.length > 0) {
      toast.error(`Duplicate file(s) detected: ${duplicateFiles.join(', ')}`);
      e.target.value = ''; // Reset file input
      return;
    }

    setIsUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...uploadedUrls]
    }));
    setUploadedFileIdentifiers(prev => [...prev, ...newIdentifiers]);
    setIsUploading(false);
    e.target.value = ''; // Reset file input
  };

  const getDuplicatePhotos = () => {
    return [];
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
    setUploadedFileIdentifiers(prev => prev.filter((_, i) => i !== index));
  };

  const setCoverPhoto = (idx) => {
    const newPhotos = [...formData.photos];
    [newPhotos[0], newPhotos[idx]] = [newPhotos[idx], newPhotos[0]];
    setFormData(prev => ({ ...prev, photos: newPhotos }));
  };

  const handleDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('photoIndex', idx.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx = parseInt(e.dataTransfer.getData('photoIndex'));
    if (sourceIdx === targetIdx) return;

    const newPhotos = [...formData.photos];
    const [movedPhoto] = newPhotos.splice(sourceIdx, 1);
    newPhotos.splice(targetIdx, 0, movedPhoto);
    setFormData(prev => ({ ...prev, photos: newPhotos }));
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.length >= 16 && formData.title.length <= 50 && !titleError && formData.property_type && formData.guest_capacity > 0;
      case 2: return formData.description.length >= 50;
      case 3: return formData.postcode && formData.latitude && formData.longitude && formData.location?.street;
      case 4: return formData.photos.length >= 5 && getDuplicatePhotos().length === 0;
      case 5: return formData.nightly_rate > 0;
      case 6: return !!formData.cancellation_policy_id;
      case 7: return formData.existing_listing_url.trim().length > 0 || formData.verification_document !== null;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    // Check subscription before creating property
    const subscriptions = await base44.entities.Subscription.filter({ 
      user_id: user.id,
      status: 'active'
    });
    
    const properties = await base44.entities.Property.filter({ owner_id: user.id });
    
    // If no active subscription and no existing properties, save draft and redirect to subscription
    if (subscriptions.length === 0 && properties.length === 0) {
      // Save property as draft locally before redirecting
      localStorage.setItem('pendingPropertyDraft', JSON.stringify({
        ...formData,
        owner_id: user.id,
      }));
      
      toast.info("Please select a subscription plan to continue");
      setTimeout(() => {
        window.location.href = createPageUrl('Subscription') + '?from=createProperty';
      }, 1500);
      return;
    }
    
    createMutation.mutate({
      ...formData,
      ...locationData,
      status: 'draft',
      existing_listing_url: formData.existing_listing_url,
      verification_document: formData.verification_document,
    });
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
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
                  step.id === currentStep ? 'text-teal-600' : 
                  step.id < currentStep ? 'text-teal-500' : 'text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.id === currentStep ? 'bg-teal-100' :
                  step.id < currentStep ? 'bg-teal-50' : 'bg-gray-100'
                }`}>
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
                      className={`mt-1 ${titleError ? 'border-red-500' : ''}`}
                      maxLength={50}
                    />
                    <div className="flex justify-between mt-1">
                      <p className={`text-sm ${titleError ? 'text-red-500' : 'text-gray-400'}`}>
                        {titleError || "16-50 characters. Special chars: - & ! ."}
                      </p>
                      <span className="text-sm text-gray-400">{formData.title.length}/50</span>
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
                        {PROPERTY_TYPES.map(type => (
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
                        onChange={(e) => handleChange("guest_capacity", parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => handleChange("bedrooms", parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.bathrooms}
                        onChange={(e) => handleChange("bathrooms", parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Description */}
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
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Describe your property, the neighborhood, and what makes it unique..."
                      rows={6}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      {formData.description.length}/50 characters minimum
                    </p>
                  </div>

                  <div>
                    <Label className="mb-3 block">Amenities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {AMENITIES.map(amenity => (
                        <label key={amenity} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <Checkbox
                            checked={formData.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                          />
                          <span className="text-sm">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>House Rules (optional)</Label>
                    <Textarea
                      value={formData.house_rules}
                      onChange={(e) => handleChange("house_rules", e.target.value)}
                      placeholder="Any specific rules guests should follow..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.pets_allowed}
                        onCheckedChange={(v) => handleChange("pets_allowed", v)}
                      />
                      <span>Pets allowed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.smoking_allowed}
                        onCheckedChange={(v) => handleChange("smoking_allowed", v)}
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
                        onChange={(e) => handleChange("minimum_child_age", parseInt(e.target.value) || 0)}
                        className="mt-1 w-32"
                      />
                      <p className="text-sm text-gray-500 mt-1">Children below this age are not permitted</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <LocationStep
                formData={formData}
                onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                onLocationChange={setLocationData}
              />
            )}

            {/* Step 4: Photos */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                  <CardDescription>Upload at least 5 photos to showcase your property</CardDescription>
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
                      <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
                    </label>
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    Users can rearrange images by dragging and dropping them into the desired order.
                  </p>

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
                              onDragStart={(e) => handleDragStart(e, idx)}
                              onDragOver={handleDragOver}
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
                                      <DropdownMenuItem onClick={() => setCoverPhoto(idx)}>
                                        Make this Picture your cover
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => removePhoto(idx)} className="text-red-600">
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
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cancellation Policy</CardTitle>
                    <CardDescription>Select the cancellation policy for this property.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Policy Type <span className="text-red-500">*</span></Label>
                      <Select 
                        value={formData.cancellation_policy_id} 
                        onValueChange={(val) => {
                          const policy = policies?.find(p => p.id === val);
                          const isStrict = policy?.policy_name?.includes("Strict");
                          setFormData(prev => ({
                            ...prev,
                            cancellation_policy_id: val,
                            cleaning_fee_refundable: !isStrict
                          }));
                        }}
                      >
                        <SelectTrigger className={`mt-1 ${!formData.cancellation_policy_id ? 'border-red-300' : ''}`}>
                          <SelectValue placeholder="Select a policy..." />
                        </SelectTrigger>
                        <SelectContent>
                          {policies?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.policy_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!formData.cancellation_policy_id && (
                        <p className="text-sm text-red-500 mt-1">Cancellation policy is required</p>
                      )}
                      {formData.cancellation_policy_id && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                          {policies?.find(p => p.id === formData.cancellation_policy_id)?.description}
                        </div>
                      )}
                      {policies?.find(p => p.id === formData.cancellation_policy_id)?.policy_name === "Super Strict" && (
                        <div className="mt-2 text-sm text-rose-600 font-medium">
                          Warning: This policy may reduce booking conversions.
                        </div>
                      )}
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

                <DayBasedBookingRules
                  value={{
                    enabled: formData.day_based_restrictions_enabled,
                    rules: formData.booking_rules
                  }}
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
                  <CardTitle>Property Verification</CardTitle>
                  <CardDescription>Provide proof that you own or manage this property. Choose one option below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="listing-url">Existing Listing URL</Label>
                    <Input
                      id="listing-url"
                      value={formData.existing_listing_url}
                      onChange={(e) => handleChange("existing_listing_url", e.target.value)}
                      placeholder="e.g. airbnb.co.uk/rooms/12345 or booking.com/..."
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-400 mt-1">Paste a link to your property on Airbnb, Booking.com, or your own website.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <div>
                    <Label>Upload Proof Document</Label>
                    <div className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-teal-300 transition-colors">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        id="verification-doc-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          const { file_url } = await base44.integrations.Core.UploadFile({ file });
                          handleChange("verification_document", file_url);
                          setIsUploading(false);
                          e.target.value = '';
                        }}
                      />
                      <label htmlFor="verification-doc-upload" className="cursor-pointer">
                        {isUploading ? (
                          <Loader2 className="w-10 h-10 mx-auto mb-3 text-teal-600 animate-spin" />
                        ) : formData.verification_document ? (
                          <Check className="w-10 h-10 mx-auto mb-3 text-teal-600" />
                        ) : (
                          <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        )}
                        <p className="text-gray-600 font-medium">
                          {isUploading ? "Uploading..." : formData.verification_document ? "Document uploaded — click to replace" : "Click to upload document"}
                        </p>
                      </label>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Utility bill, council tax bill, land registry document, purchase invoice, or holiday park pitch agreement. Must match the postcode entered above.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            {currentStep > 1 && currentStep < STEPS.length && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={createMutation.isPending}
              >
                Save as Draft
              </Button>
            )}
          </div>

          {currentStep < STEPS.length ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              className="bg-teal-600 hover:bg-teal-700 gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !canProceed()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Submit for Review"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}