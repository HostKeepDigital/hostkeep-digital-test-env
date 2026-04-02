import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Lock, XCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * LOCATION STEP
 *
 * Postcode is the single source of truth.
 * Uses Postcodes.io (via postcodeGeolookupV2 backend function) for authoritative data.
 * Checks that the postcode is within the Cornwall/Devon launch area (TR, PL, EX).
 */

// HostKeep launch area — Cornwall & Devon postcode areas only
const ALLOWED_AREAS = ["TR", "PL", "EX"];

function getAreaLabel(postcodeArea) {
  if (!postcodeArea) return null;
  const map = {
    TR: "Cornwall",
    PL: "Plymouth / Cornwall",
    EX: "Devon / Exeter",
  };
  return map[postcodeArea] || null;
}

export default function LocationStep({ formData, onFormChange, onLocationChange, signupPostcode }) {
  const buildPostcodeData = (fd) => {
    if (fd.postcode) {
      return {
        postcode: fd.postcode,
        county: fd.county,
        district: fd.postcode_district,
        postcode_area: fd.postcode_area,
        parish: fd.town,
        country: fd.country,
        latitude: fd.latitude,
        longitude: fd.longitude,
        source: "saved",
      };
    }
    return null;
  };

  

  const [postcodeInput, setPostcodeInput] = useState(formData.postcode || "");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [postcodeData, setPostcodeData] = useState(() => buildPostcodeData(formData));

  // Derive in-area state directly from postcodeData
  const inArea = postcodeData
    ? ALLOWED_AREAS.includes(postcodeData.postcode_area)
    : null; // null = not yet checked

  // Sync when formData.postcode arrives asynchronously (e.g. after DB load)
  useEffect(() => {
    if (formData.postcode && !postcodeData) {
      setPostcodeInput(formData.postcode);
      setPostcodeData(buildPostcodeData(formData));
    }
  }, [formData.postcode]);

  const handlePostcodeLookup = async () => {
    const raw = postcodeInput.trim();
    if (!raw) {
      setPostcodeError("Please enter a postcode.");
      return;
    }

    useEffect(() => {
      if (signupPostcode && !formData.postcode && !postcodeData && !postcodeLoading) {
        setPostcodeInput(signupPostcode.toUpperCase());
        // Auto-trigger the lookup after a short delay so UI has settled
        setTimeout(() => {
          handlePostcodeLookup();
        }, 300);
      }
    }, [signupPostcode]);

    setPostcodeLoading(true);
    setPostcodeError("");
    setPostcodeData(null);

    try {
      const sessionToken = localStorage.getItem("session_token");

      const { data } = await base44.functions.invoke("postcodeGeolookupV2", {
        postcode: raw,
        session_token: sessionToken,
      });

      if (!data.success) {
        setPostcodeError(data.error || "Please enter a valid UK postcode.");
        return;
      }

      // Store the authoritative postcode data
      setPostcodeData(data);

      // Update formData with ALL authoritative fields from Postcodes.io
      onFormChange("postcode", data.postcode);
      onFormChange("postcode_district", data.postcode_district);
      onFormChange("postcode_area", data.postcode_area);
      onFormChange("county", data.county);
      onFormChange("town", data.district);
      onFormChange("country", data.country);
      onFormChange("latitude", data.latitude);
      onFormChange("longitude", data.longitude);

      const allowed = ALLOWED_AREAS.includes(data.postcode_area);

      if (allowed) {
        if (onLocationChange) {
          onLocationChange({
            lat: data.latitude,
            lng: data.longitude,
            county: data.county,
            district: data.district,
            country: data.country,
          });
        }
        toast.success(`Postcode verified — ${getAreaLabel(data.postcode_area) || data.county || data.district}`);
      } else {
        toast.error("Postcode is outside the current launch area.");
      }
    } catch (error) {
      setPostcodeError("Postcode lookup failed. Please try again.");
    } finally {
      setPostcodeLoading(false);
    }
  };

  const canSave = () => {
    return postcodeData && inArea && formData.location?.street;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Location</CardTitle>
        <CardDescription>
          Enter your postcode for accurate location data. HostKeep is currently available in{" "}
          <strong>Cornwall and Devon</strong> only.
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
                setPostcodeData(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePostcodeLookup()}
              placeholder="e.g. PL13 2JE"
              className={`flex-1 ${postcodeError ? "border-red-500" : ""}`}
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

        {/* IN-AREA: Verified successfully */}
        {postcodeData && inArea && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Postcode Verified — {getAreaLabel(postcodeData.postcode_area)}
              <span className="text-xs font-normal text-green-700 ml-1">
                via {postcodeData.source === "cache" ? "cached data" : "Postcodes.io official API"}
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
                <span className="text-green-900">{postcodeData.county || "—"}</span>
              </div>
              <div>
                <span className="text-green-700 font-medium">District:</span>{" "}
                <span className="text-green-900">{postcodeData.district || "—"}</span>
              </div>
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

        {/* OUT-OF-AREA: Postcode verified but not in launch region */}
        {postcodeData && !inArea && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-amber-600" />
              Outside Launch Area
            </h4>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>{postcodeData.postcode}</strong> is in{" "}
              {postcodeData.county || postcodeData.district || postcodeData.country}, which isn't in
              our current launch region. HostKeep is currently available in{" "}
              <strong>Cornwall and Devon</strong> only (postcode areas TR, PL, EX).
            </p>
            <p className="text-sm text-amber-700">
              We're expanding across the UK throughout 2026 and 2027. If you'd like to be notified
              when we reach your area, contact us at{" "}
              <a
                href="mailto:hello@hostkeepdigital.co.uk"
                className="underline font-medium hover:text-amber-900"
              >
                hello@hostkeepdigital.co.uk
              </a>
              .
            </p>
          </div>
        )}

        {/* STREET ADDRESS — only shown when postcode is verified and in-area */}
        {postcodeData && inArea && (
          <div className="space-y-4 pt-2 border-t">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" /> Address Details
            </h4>

            <div>
              <Label>Street Address <span className="text-red-500">*</span></Label>
              <Input
                value={formData.location?.street || ""}
                onChange={(e) =>
                  onFormChange("location", { ...formData.location, street: e.target.value })
                }
                placeholder="123 High Street"
                className="mt-1"
              />
            </div>

            <div>
              <Label>
                Locality / Village{" "}
                <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <Input
                value={formData.location?.locality || ""}
                onChange={(e) =>
                  onFormChange("location", { ...formData.location, locality: e.target.value })
                }
                placeholder="e.g. Polperro"
                className="mt-1"
              />
            </div>

            {/* Read-only admin fields populated from postcode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">
                  County <span className="text-xs">(from postcode)</span>
                </Label>
                <Input
                  value={postcodeData.county || postcodeData.district || ""}
                  disabled
                  className="mt-1 bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <Label className="text-gray-500">
                  Country <span className="text-xs">(from postcode)</span>
                </Label>
                <Input
                  value={postcodeData.country || ""}
                  disabled
                  className="mt-1 bg-gray-50 text-gray-600"
                />
              </div>
            </div>
          </div>
        )}

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
                {!postcodeData
                  ? "Verify your postcode to continue."
                  : !inArea
                  ? "Postcode is outside the current launch area. Properties can only be listed in Cornwall and Devon."
                  : "Street address is required."}
              </span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}