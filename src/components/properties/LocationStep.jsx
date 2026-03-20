import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Lock } from "lucide-react";
import { toast } from "sonner";

/**
 * LOCATION STEP
 * 
 * Postcode is the single source of truth.
 * Uses Postcodes.io (via postcodeGeolookupV2 backend function) for authoritative data.
 * No reverse geocoding. No centroid guessing. No nearest-city overrides.
 */

export default function LocationStep({ formData, onFormChange, onLocationChange }) {
  const buildPostcodeData = (fd) => {
    if (fd.postcode) {
      return {
        postcode: fd.postcode,
        county: fd.county,
        district: fd.postcode_district,
        parish: fd.town,
        country: fd.country,
        latitude: fd.latitude,
        longitude: fd.longitude,
        source: 'saved'
      };
    }
    return null;
  };

  const [postcodeInput, setPostcodeInput] = useState(formData.postcode || "");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [postcodeData, setPostcodeData] = useState(() => buildPostcodeData(formData));

  const handlePostcodeLookup = async () => {
    const raw = postcodeInput.trim();
    if (!raw) {
      setPostcodeError("Please enter a postcode.");
      return;
    }

    setPostcodeLoading(true);
    setPostcodeError("");
    setPostcodeData(null);

    try {
      const { data } = await base44.functions.invoke('postcodeGeolookupV2', {
        postcode: raw
      });

      if (!data.success) {
        setPostcodeError(data.error || 'Please enter a valid UK postcode.');
        return;
      }

      // Store the authoritative postcode data
      setPostcodeData(data);

      // Update formData with ALL authoritative fields from Postcodes.io
      // These are locked — never overridden by reverse geocoding
      onFormChange('postcode', data.postcode);
      onFormChange('postcode_district', data.postcode_district);
      onFormChange('postcode_area', data.postcode_area);
      onFormChange('county', data.county);
      onFormChange('town', data.district);
      onFormChange('country', data.country);
      onFormChange('latitude', data.latitude);
      onFormChange('longitude', data.longitude);

      // Also notify parent of location coords for search indexing
      if (onLocationChange) {
        onLocationChange({
          lat: data.latitude,
          lng: data.longitude,
          county: data.county,
          district: data.district,
          country: data.country
        });
      }

      toast.success(`Postcode verified: ${data.county || data.district}, ${data.country}`);
    } catch (error) {
      setPostcodeError('Postcode lookup failed. Please try again.');
    } finally {
      setPostcodeLoading(false);
    }
  };

  const canSave = () => {
    return postcodeData && formData.location?.street;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Location</CardTitle>
        <CardDescription>
          Enter your postcode for accurate location data. All administrative fields are populated automatically from official UK postcode records.
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
              onKeyDown={(e) => e.key === 'Enter' && handlePostcodeLookup()}
              placeholder="e.g. PL13 2JE"
              className={`flex-1 ${postcodeError ? 'border-red-500' : ''}`}
              disabled={postcodeLoading}
              maxLength={8}
            />
            <Button
              onClick={handlePostcodeLookup}
              disabled={postcodeLoading || !postcodeInput.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {postcodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
          {postcodeError && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {postcodeError}
            </p>
          )}
        </div>

        {/* VERIFIED POSTCODE RESULT — read-only, authoritative */}
        {postcodeData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Postcode Verified
              <span className="text-xs font-normal text-green-700 ml-1">
                via {postcodeData.source === 'cache' ? 'cached data' : 'Postcodes.io official API'}
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-green-700 font-medium">Postcode:</span>{" "}
                <span className="text-green-900">{postcodeData.postcode}</span>
              </div>
              <div>
                <span className="text-green-700 font-medium">Country:</span>{" "}
                <span className="text-green-900">{postcodeData.country}</span>
              </div>
              <div>
                <span className="text-green-700 font-medium">County:</span>{" "}
                <span className="text-green-900">{postcodeData.county || '—'}</span>
              </div>
              <div>
                <span className="text-green-700 font-medium">District:</span>{" "}
                <span className="text-green-900">{postcodeData.district || '—'}</span>
              </div>
              {postcodeData.parish && (
                <div>
                  <span className="text-green-700 font-medium">Parish:</span>{" "}
                  <span className="text-green-900">{postcodeData.parish}</span>
                </div>
              )}
              <div>
                <span className="text-green-700 font-medium">Coordinates:</span>{" "}
                <span className="text-green-900 font-mono text-xs">
                  {postcodeData.latitude?.toFixed(5)}, {postcodeData.longitude?.toFixed(5)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-700 pt-1 border-t border-green-200">
              <Lock className="w-3 h-3" />
              Administrative data is locked to official postcode records and will not be overridden.
            </div>
          </div>
        )}

        {/* STREET ADDRESS — manual entry */}
        <div className="space-y-4 pt-2 border-t">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" /> Address Details
          </h4>

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
            <Label>Locality / Village <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input
              value={formData.location?.locality || ""}
              onChange={(e) => onFormChange('location', { ...formData.location, locality: e.target.value })}
              placeholder="e.g. Polperro"
              className="mt-1"
            />
          </div>

          {/* Read-only admin fields populated from postcode */}
          {postcodeData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">County <span className="text-xs">(from postcode)</span></Label>
                <Input value={postcodeData.county || postcodeData.district || ""} disabled className="mt-1 bg-gray-50 text-gray-600" />
              </div>
              <div>
                <Label className="text-gray-500">Country <span className="text-xs">(from postcode)</span></Label>
                <Input value={postcodeData.country || ""} disabled className="mt-1 bg-gray-50 text-gray-600" />
              </div>
            </div>
          )}
        </div>

        {/* READINESS INDICATOR */}
        <div className="pt-2 border-t">
          {canSave() ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Location complete. Ready to continue.
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {!postcodeData ? 'Verify your postcode to continue.' : 'Street address is required.'}
              </span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}