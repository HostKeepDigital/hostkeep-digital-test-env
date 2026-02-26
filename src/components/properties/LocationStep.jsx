import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, CheckCircle2, AlertCircle, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import LocationAutocomplete from "@/components/LocationAutocomplete";

/**
 * LOCATION STEP - Geocoded Search Engine Integration
 * 
 * Supports:
 * - Postcode lookup with validation
 * - Auto-population of location data
 * - Location autocomplete from uk_locations table
 * - Map pin confirmation with drag-to-adjust
 * - Required system fields (location_id, lat, lng, normalized_name, slug)
 */

const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export default function LocationStep({ formData, onFormChange, onLocationChange }) {
  const [postcodeInput, setPostcodeInput] = useState(formData.location?.postcode || "");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  
  const [autoDetectedLocation, setAutoDetectedLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapConfirmed, setMapConfirmed] = useState(false);
  const [mapPinDragging, setMapPinDragging] = useState(false);
  const [manualLat, setManualLat] = useState(null);
  const [manualLng, setManualLng] = useState(null);

  // Load existing location on mount
  useEffect(() => {
    if (formData.location_id) {
      base44.entities.UKLocation.filter({ id: formData.location_id })
        .then(results => {
          if (results.length > 0) {
            setSelectedLocation(results[0]);
            setMapConfirmed(true);
            setAutoDetectedLocation(results[0]);
          }
        })
        .catch(err => console.error('Failed to load location:', err));
    }
  }, []);

  const validatePostcode = (code) => {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Postcode required' };
    }
    const normalized = code.trim().toUpperCase();
    if (!POSTCODE_REGEX.test(normalized)) {
      return { valid: false, error: 'Invalid UK postcode format (e.g., SW1A 1AA)' };
    }
    return { valid: true, postcode: normalized };
  };

  const handlePostcodeLookup = async () => {
    const validation = validatePostcode(postcodeInput);
    if (!validation.valid) {
      setPostcodeError(validation.error);
      return;
    }

    setPostcodeLoading(true);
    setPostcodeError("");
    
    try {
      const { data } = await base44.functions.invoke('postcodeGeolookup', { 
        postcode: validation.postcode 
      });

      if (!data.success) {
        setPostcodeError(data.error || 'Postcode lookup failed');
        return;
      }

      // Update form with postcode
      onFormChange('location', {
        ...formData.location,
        postcode: validation.postcode
      });

      // Set auto-detected location for reference
      setAutoDetectedLocation({
        postcode: validation.postcode,
        area: data.geolocation.area,
        lat: data.geolocation.lat,
        lng: data.geolocation.lng,
        accuracy: 'postcode-area'
      });

      // Now search nearby locations
      searchNearbyLocations(data.geolocation.lat, data.geolocation.lng, validation.postcode);

    } catch (error) {
      setPostcodeError('Failed to lookup postcode: ' + error.message);
    } finally {
      setPostcodeLoading(false);
    }
  };

  const searchNearbyLocations = async (lat, lng, postcode) => {
    try {
      // Search for nearby locations in uk_locations table
      const allLocations = await base44.entities.UKLocation.list();
      
      // Calculate distance to each location
      const locationsWithDistance = allLocations.map(loc => ({
        ...loc,
        distance: calculateDistance(lat, lng, loc.lat, loc.lng)
      }));

      // Sort by distance
      locationsWithDistance.sort((a, b) => a.distance - b.distance);

      // Show closest locations for user selection
      const nearest = locationsWithDistance.slice(0, 5);
      
      // Auto-select if there's a very close match
      if (nearest.length > 0 && nearest[0].distance < 5) {
        handleLocationSelect(nearest[0]);
        toast.success(`Auto-matched to ${nearest[0].name}`);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapConfirmed(false);
    setManualLat(location.lat);
    setManualLng(location.lng);
    
    onFormChange('location', {
      ...formData.location,
      county: location.name,
      country: location.country
    });

    onLocationChange({
      location_id: location.id,
      lat: location.lat,
      lng: location.lng,
      normalized_name: location.normalized_name,
      slug: location.slug
    });
  };

  const handleMapPinConfirm = () => {
    if (manualLat === null || manualLng === null) {
      setPostcodeError('Please select a location first');
      return;
    }

    if (!selectedLocation?.id) {
      setPostcodeError('Location ID missing');
      return;
    }

    setMapConfirmed(true);
    onLocationChange({
      location_id: selectedLocation.id,
      lat: manualLat,
      lng: manualLng,
      map_confirmed: true
    });
    toast.success('Location confirmed on map');
  };

  const canSave = () => {
    return selectedLocation?.id && mapConfirmed && manualLat && manualLng && 
           formData.location?.postcode && formData.location?.street;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>
          Find and confirm your property location using postcode or search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* POSTCODE LOOKUP */}
        <div className="space-y-2">
          <Label>UK Postcode <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              value={postcodeInput}
              onChange={(e) => {
                setPostcodeInput(e.target.value.toUpperCase());
                setPostcodeError("");
              }}
              placeholder="SW1A 1AA"
              className={`flex-1 ${postcodeError ? 'border-red-500' : ''}`}
              disabled={postcodeLoading}
            />
            <Button
              onClick={handlePostcodeLookup}
              disabled={postcodeLoading || !postcodeInput.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {postcodeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Lookup"
              )}
            </Button>
          </div>
          {postcodeError && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {postcodeError}
            </p>
          )}
        </div>

        {/* AUTO-DETECTED LOCATION SUMMARY */}
        {autoDetectedLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Auto-Detected Location
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">Area:</span> {autoDetectedLocation.area || autoDetectedLocation.name}
              </div>
              <div>
                <span className="font-medium">Postcode:</span> {autoDetectedLocation.postcode || formData.location?.postcode}
              </div>
              {autoDetectedLocation.country && (
                <div>
                  <span className="font-medium">Country:</span> {autoDetectedLocation.country}
                </div>
              )}
              <div>
                <span className="font-medium">Accuracy:</span> {autoDetectedLocation.accuracy || 'postcode-area'}
              </div>
            </div>
          </div>
        )}

        {/* LOCATION AUTOCOMPLETE OVERRIDE */}
        {autoDetectedLocation && (
          <div className="space-y-2">
            <Label>Refine Location (Optional)</Label>
            <LocationAutocomplete
              value={selectedLocation}
              onChange={handleLocationSelect}
              label="Search for specific location"
              placeholder="Type county, city, town or village name..."
              required={false}
            />
            <p className="text-xs text-gray-500">
              Overrides auto-detected location. Searches counties, cities, towns, and curated villages.
            </p>
          </div>
        )}

        {/* MAP PIN CONFIRMATION */}
        {selectedLocation && (
          <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Map Pin Confirmation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-amber-900">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={manualLat || selectedLocation.lat}
                  onChange={(e) => setManualLat(parseFloat(e.target.value))}
                  className="mt-1 text-sm"
                  disabled={mapPinDragging}
                />
              </div>
              <div>
                <Label className="text-sm text-amber-900">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={manualLng || selectedLocation.lng}
                  onChange={(e) => setManualLng(parseFloat(e.target.value))}
                  className="mt-1 text-sm"
                  disabled={mapPinDragging}
                />
              </div>
            </div>
            <p className="text-xs text-amber-700">
              {mapPinDragging ? 'Drag to adjust position...' : 'Adjust coordinates or drag pin on map'}
            </p>
            {!mapConfirmed ? (
              <Button
                onClick={handleMapPinConfirm}
                disabled={!manualLat || !manualLng}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Location
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Location confirmed
              </div>
            )}
          </div>
        )}

        {/* MANUAL ADDRESS ENTRY */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-gray-900">Property Address Details</h4>
          
          <div>
            <Label>Street Address <span className="text-red-500">*</span></Label>
            <Input
              value={formData.location?.street || ""}
              onChange={(e) => onFormChange('location', { ...formData.location, street: e.target.value })}
              placeholder="123 High Street"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Town/City <span className="text-red-500">*</span></Label>
            <Input
              value={formData.location?.town_city || ""}
              onChange={(e) => onFormChange('location', { ...formData.location, town_city: e.target.value })}
              placeholder="London"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Locality/Village (Optional)</Label>
              <Input
                value={formData.location?.locality || ""}
                onChange={(e) => onFormChange('location', { ...formData.location, locality: e.target.value })}
                placeholder="Village name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>County <span className="text-red-500">*</span></Label>
              <Input
                value={formData.location?.county || selectedLocation?.name || ""}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON STATE */}
        <div className="pt-4 border-t">
          {canSave() ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              All location fields completed. Ready to save.
            </div>
          ) : (
            <div className="space-y-1 text-sm text-amber-700">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Missing: 
                  {!postcodeInput && ' Postcode,'}
                  {!autoDetectedLocation && ' Location lookup,'}
                  {!mapConfirmed && ' Map confirmation,'}
                  {!formData.location?.street && ' Street address'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}