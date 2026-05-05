import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Lock, XCircle } from "lucide-react";
import { toast } from "sonner";

// HostKeep launch area — Cornwall & Devon postcode areas only
const ALLOWED_AREAS = ["TR", "PL", "EX"];

function getAreaLabel(postcodeArea) {
  if (!postcodeArea) return null;
  const map = { TR: "Cornwall", PL: "Plymouth / Cornwall", EX: "Devon / Exeter" };
  return map[postcodeArea] || null;
}

function buildPostcodeData(fd) {
  if (!fd?.postcode) return null;
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

export default function LocationStep({ formData, onFormChange, onLocationChange, signupPostcode, isBeta, isFirstProperty = true }) {
  // If in beta with no saved postcode, we MUST wait for signupPostcode to arrive and auto-verify
  const expectAutoVerify = !!(isBeta && !formData.postcode);

  const [isReady, setIsReady] = useState(!expectAutoVerify);
  const [postcodeInput, setPostcodeInput] = useState(formData.postcode || signupPostcode || "");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [postcodeData, setPostcodeData] = useState(() => buildPostcodeData(formData));

  const didAutoLookup = useRef(false);
  const timeoutRef = useRef(null);

  // Derive in-area state directly from postcodeData
  const inArea = postcodeData ? ALLOWED_AREAS.includes(postcodeData.postcode_area) : null;

  // Sync when formData.postcode arrives asynchronously (e.g. after DB load)
  useEffect(() => {
    if (formData.postcode && !postcodeData) {
      setPostcodeInput(formData.postcode);
      setPostcodeData(buildPostcodeData(formData));
    }
  }, [formData.postcode]);

  // Safety: if expectAutoVerify but signupPostcode never arrives after 5s, release the spinner
  useEffect(() => {
    if (!expectAutoVerify || isReady) return;
    const t = setTimeout(() => setIsReady(true), 5000);
    return () => clearTimeout(t);
  }, [expectAutoVerify]);

  // Auto-verify from signupPostcode as soon as it arrives
  useEffect(() => {
    if (!signupPostcode || formData.postcode || postcodeData || didAutoLookup.current) return;
    didAutoLookup.current = true;
    const upper = signupPostcode.toUpperCase();
    setPostcodeInput(upper);

    // Safety timeout — if lookup takes > 8s, show the form anyway so user isn't stuck
    timeoutRef.current = setTimeout(() => {
      setPostcodeError("Postcode verification timed out. Please verify manually.");
      setPostcodeLoading(false);
      setIsReady(true);
    }, 8000);

    doLookup(upper);

    return () => clearTimeout(timeoutRef.current);
  }, [signupPostcode]);

  // Mark ready once lookup completes (success or error)
  useEffect(() => {
    if (isReady) return;
    if (didAutoLookup.current && !postcodeLoading && (postcodeData || postcodeError)) {
      clearTimeout(timeoutRef.current);
      setIsReady(true);
    }
  }, [postcodeLoading, postcodeData, postcodeError]);

  const doLookup = async (postcode) => {
    const raw = (postcode || postcodeInput).trim();
    if (!raw) {
      setPostcodeError("Please enter a postcode.");
      return;
    }

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

      setPostcodeData(data);
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
          onLocationChange({ lat: data.latitude, lng: data.longitude, county: data.county, district: data.district, country: data.country });
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

  const canSave = () => postcodeData && (inArea || !isFirstProperty) && formData.location?.street;

  // Show spinner while auto-verifying
  if (!isReady) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Verifying your postcode...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          {signupPostcode && isBeta && (
            <div className="flex items-center gap-1.5 text-xs text-teal-600 font-medium bg-teal-50 border border-teal-200 rounded px-2 py-1.5">
              <Lock className="w-3 h-3 flex-shrink-0" />
              Postcode locked to your founding member registration area during beta.
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={postcodeInput}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setPostcodeInput(val);
                setPostcodeError("");
                if (postcodeData) setPostcodeData(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && doLookup(postcodeInput)}
              placeholder="e.g. PL13 2JE"
              className={`flex-1 ${postcodeError ? "border-red-500" : ""} ${postcodeData ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
              disabled={postcodeLoading || !!postcodeData || (isBeta && !!signupPostcode)}
              maxLength={8}
              autoComplete="off"
            />
            <Button
              onClick={() => doLookup(postcodeInput)}
              disabled={postcodeLoading || !postcodeInput.trim() || (isBeta && !!signupPostcode)}
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
        {postcodeData && (inArea || !isFirstProperty) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Postcode Verified — {getAreaLabel(postcodeData.postcode_area)}
              <span className="text-xs font-normal text-green-700 ml-1">
                via {postcodeData.source === "cache" ? "cached data" : postcodeData.source === "saved" ? "saved data" : "Postcodes.io official API"}
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-green-700 font-medium">Postcode:</span> <span className="text-green-900">{postcodeData.postcode}</span></div>
              <div><span className="text-green-700 font-medium">Country:</span> <span className="text-green-900">{postcodeData.country}</span></div>
              <div><span className="text-green-700 font-medium">County:</span> <span className="text-green-900">{postcodeData.county || "—"}</span></div>
              <div><span className="text-green-700 font-medium">District:</span> <span className="text-green-900">{postcodeData.district || "—"}</span></div>
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

        {/* OUT-OF-AREA */}
        {/* First property outside Cornwall — hard stop */}
        {postcodeData && !inArea && isFirstProperty && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-red-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" /> Outside Beta Area
            </h4>
            <p className="text-sm text-red-800 leading-relaxed">
              <strong>{postcodeData.postcode}</strong> is in{" "}
              {postcodeData.county || postcodeData.district || postcodeData.country}. During beta, your first property must be located in <strong>Cornwall</strong> (postcode areas TR, PL, EX).
            </p>
            <p className="text-sm text-red-700">
              We're expanding across the UK in 2026. You'll be notified when HostKeep launches in your area.
            </p>
          </div>
        )}

        {/* Second+ property outside Cornwall — soft warning (beta only) */}
        {betaActive && postcodeData && !inArea && !isFirstProperty && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Outside Current Beta Area
            </h4>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>{postcodeData.postcode}</strong> is in{" "}
              {postcodeData.county || postcodeData.district || postcodeData.country}. This property cannot be published during beta but you can complete the full setup now.
            </p>
            <p className="text-sm text-amber-700">
              When HostKeep launches nationally, this property will be ready to publish. We'll notify you when your area goes live. Note that cleaner availability may be limited at launch.
            </p>
          </div>
        )}

        {/* STREET ADDRESS */}
        {postcodeData && (inArea || !isFirstProperty) && (
          <div className="space-y-4 pt-2 border-t">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" /> Address Details
            </h4>
            <div>
              <Label>Street Address <span className="text-red-500">*</span></Label>
              <Input
                value={formData.location?.street || ""}
                onChange={(e) => onFormChange("location", { ...formData.location, street: e.target.value })}
                placeholder="123 High Street"
                className={`mt-1 ${postcodeData && inArea && !formData.location?.street ? "border-amber-400" : ""}`}
              />
              {!formData.location?.street && (
                <p className="text-xs text-amber-600 mt-1">Street address is required to continue.</p>
              )}
            </div>
            <div>
              <Label>Locality / Village <span className="text-gray-400 text-xs">(optional)</span></Label>
              <Input
                value={formData.location?.locality || ""}
                onChange={(e) => onFormChange("location", { ...formData.location, locality: e.target.value })}
                placeholder="e.g. Polperro"
                className="mt-1"
              />
            </div>
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
          </div>
        )}

        {/* READINESS INDICATOR */}
        <div className="pt-2 border-t">
          {canSave() ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Location complete. Ready to continue.
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {!postcodeData
                  ? "Verify your postcode to continue."
                  : !inArea
                  ? "Postcode is outside the current launch area. Properties can only be listed in Cornwall and Devon."
                  : "Street address is required to continue."}
              </span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}