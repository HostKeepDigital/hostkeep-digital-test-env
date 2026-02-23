import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, MapPin, Image, PoundSterling, FileText, Upload, X, Loader2, ArrowLeft, Calendar, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DayBasedBookingRules from "@/components/properties/DayBasedBookingRules";
import PricingManager from "@/components/pricing/PricingManager";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "cabin", label: "Cabin" },
  { value: "cottage", label: "Cottage" },
  { value: "bungalow", label: "Bungalow" },
];

const AMENITIES = [
  "WiFi", "Pool", "Parking", "Air Conditioning", "Kitchen", "Washing Machine",
  "TV", "Hot Tub", "Garden", "BBQ", "Gym", "Beach Access", "Fireplace",
  "Workspace", "Iron", "Hair Dryer", "Dishwasher", "Coffee Maker"
];

export default function EditProperty() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [uploadedFileIdentifiers, setUploadedFileIdentifiers] = useState([]);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({ id: propertyId });
      return results[0];
    },
    enabled: !!propertyId,
  });

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        property_type: property.property_type || "house",
        guest_capacity: property.guest_capacity || 4,
        bedrooms: property.bedrooms || 2,
        bathrooms: property.bathrooms || 1,
        location: property.location || { 
          street: "", 
          locality: "", 
          town_city: "", 
          postcode: ""
        },
        photos: property.photos || [],
        nightly_rate: property.nightly_rate || 100,
        cleaning_fee: property.cleaning_fee || 0,
        security_deposit: property.security_deposit || 0,
        minimum_stay: property.minimum_stay || 1,
        description: property.description || "",
        amenities: property.amenities || [],
        house_rules: property.house_rules || "",
        pets_allowed: property.pets_allowed || false,
        smoking_allowed: property.smoking_allowed || false,
        children_allowed: property.children_allowed || false,
        minimum_child_age: property.minimum_child_age ?? null,
        check_in_time: property.check_in_time || "15:00",
        check_out_time: property.check_out_time || "10:00",
        day_based_restrictions_enabled: property.day_based_restrictions_enabled || false,
        booking_rules: property.booking_rules || {},
        pricing_settings: property.pricing_settings || {
          base_rate: property.nightly_rate || 100,
          price_rounding: null,
          weekday_rate: null,
          weekend_rate: null,
          seasons: [],
          date_overrides: {}
        },
        status: property.status || "draft",
      });
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.update(propertyId, data),
    onSuccess: () => {
      toast.success("Property updated successfully!");
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

  const handleSave = () => {
    if (formData.photos.length < 5) {
      toast.error("Please upload at least 5 photos before saving");
      return;
    }
    if (getDuplicatePhotos().length > 0) {
      toast.error("Please remove duplicate photos before saving");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('HostProperties')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Edit Property</h1>
                <p className="text-sm text-gray-500">{formData.title}</p>
              </div>
            </div>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending || formData.photos.length < 5 || getDuplicatePhotos().length > 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="basics" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="basics"><Home className="w-4 h-4 mr-2" /> Basics</TabsTrigger>
            <TabsTrigger value="details"><FileText className="w-4 h-4 mr-2" /> Description</TabsTrigger>
            <TabsTrigger value="location"><MapPin className="w-4 h-4 mr-2" /> Location</TabsTrigger>
            <TabsTrigger value="photos"><Image className="w-4 h-4 mr-2" /> Photos</TabsTrigger>
            <TabsTrigger value="pricing"><PoundSterling className="w-4 h-4 mr-2" /> Pricing</TabsTrigger>
            <TabsTrigger value="booking-rules"><Calendar className="w-4 h-4 mr-2" /> Booking Rules</TabsTrigger>
          </TabsList>

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
                  <Select value={formData.property_type} onValueChange={(v) => handleChange("property_type", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
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

          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Street</Label>
                  <Input
                    value={formData.location.street}
                    onChange={(e) => handleLocationChange("street", e.target.value)}
                    placeholder="123 High Street"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Locality/Village (Optional)</Label>
                  <Input
                    value={formData.location.locality || ""}
                    onChange={(e) => handleLocationChange("locality", e.target.value)}
                    placeholder="Village name"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Town/City</Label>
                    <Input
                      value={formData.location.town_city}
                      onChange={(e) => handleLocationChange("town_city", e.target.value)}
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
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-300 transition-colors">
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-teal-600 animate-spin" />
                    ) : (
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    )}
                    <p className="text-gray-600 font-medium">{isUploading ? "Uploading..." : "Click to upload photos"}</p>
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Users can rearrange images by dragging and dropping them into the desired order.
                </p>

                {formData.photos.length < 5 && (
                  <p className="text-sm text-red-500 mt-2">
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
                        <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover rounded-lg pointer-events-none" />
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
                        {idx === 0 && <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">Cover</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <PricingManager
              formData={formData}
              onUpdate={(field, value) => handleChange(field, value)}
            />
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Description & Amenities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Property Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={6}
                    className="mt-1"
                  />
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
                  <Label>House Rules</Label>
                  <Textarea
                    value={formData.house_rules}
                    onChange={(e) => handleChange("house_rules", e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.pets_allowed} onCheckedChange={(v) => handleChange("pets_allowed", v)} />
                    <span>Pets allowed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.smoking_allowed} onCheckedChange={(v) => handleChange("smoking_allowed", v)} />
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
          </TabsContent>

          <TabsContent value="booking-rules">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}