import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { 
  Home, MapPin, Image, PoundSterling, Calendar, FileText, 
  ChevronLeft, ChevronRight, Upload, X, Check, Loader2
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Basics", icon: Home, description: "Property type and details" },
  { id: 2, title: "Location", icon: MapPin, description: "Where is your property?" },
  { id: 3, title: "Photos", icon: Image, description: "Show off your space" },
  { id: 4, title: "Pricing", icon: PoundSterling, description: "Set your rates" },
  { id: 5, title: "Description", icon: FileText, description: "Tell guests about your place" },
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

  const [titleError, setTitleError] = useState("");

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
      address_line_1: "123 High Street",
      address_line_2: "Flat 4B",
      city: "London",
      postcode: "SW1A 1AA"
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
    status: "draft"
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      window.location.href = createPageUrl('Home');
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create({ ...data, owner_id: user?.id }),
    onSuccess: (property) => {
      toast.success("Property created successfully!");
      window.location.href = createPageUrl('HostProperties');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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
    setIsUploading(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
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
      case 2: return formData.location.city && formData.location.postcode;
      case 3: return formData.photos.length >= 5;
      case 4: return formData.nightly_rate > 0;
      case 5: return formData.description.length >= 50;
      default: return true;
    }
  };

  const handleSubmit = (publish = false) => {
    createMutation.mutate({
      ...formData,
      status: publish ? 'published' : 'draft'
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
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
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

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>Where is your property located?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Address Line 1</Label>
                    <Input
                      value={formData.location.address_line_1}
                      onChange={(e) => handleLocationChange("address_line_1", e.target.value)}
                      placeholder="123 High Street"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Address Line 2 (Optional)</Label>
                    <Input
                      value={formData.location.address_line_2}
                      onChange={(e) => handleLocationChange("address_line_2", e.target.value)}
                      placeholder="Flat 4B"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.location.city}
                        onChange={(e) => handleLocationChange("city", e.target.value)}
                        placeholder="London"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Postcode</Label>
                      <Input
                        value={formData.location.postcode}
                        onChange={(e) => handleLocationChange("postcode", e.target.value.toUpperCase())}
                        placeholder="SW1A 1AA"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Photos */}
            {currentStep === 3 && (
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

                  <p className={`text-sm mt-2 ${formData.photos.length < 5 ? 'text-red-500' : 'text-green-600'}`}>
                    {formData.photos.length} / 5 photos uploaded {formData.photos.length < 5 && '(minimum 5 required)'}
                  </p>

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {formData.photos.map((photo, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removePhoto(idx)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
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

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                  <CardDescription>Set your rates and fees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Nightly Rate (£)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.nightly_rate}
                      onChange={(e) => handleChange("nightly_rate", parseInt(e.target.value) || 0)}
                      className="mt-1 text-2xl font-semibold h-14"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cleaning Fee (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cleaning_fee}
                        onChange={(e) => handleChange("cleaning_fee", parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Security Deposit (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.security_deposit}
                        onChange={(e) => handleChange("security_deposit", parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Minimum Stay (nights)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.minimum_stay}
                      onChange={(e) => handleChange("minimum_stay", parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Check-in Time</Label>
                      <Input
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e) => handleChange("check_in_time", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Check-out Time</Label>
                      <Input
                        type="time"
                        value={formData.check_out_time}
                        onChange={(e) => handleChange("check_out_time", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Description */}
            {currentStep === 5 && (
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
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

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
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={createMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={createMutation.isPending || !canProceed()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Publish Property"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}