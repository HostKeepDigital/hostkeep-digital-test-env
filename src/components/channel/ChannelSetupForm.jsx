import { useState } from "react";
import {
  createChannelListing,
  validateIcalUrl
} from "../../utils/api/channelManager";

export function ChannelSetupForm({ propertyId, channel, onBack, onComplete }) {
  const [icalUrl, setIcalUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      await validateIcalUrl(icalUrl);
      setValidated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await createChannelListing({
        propertyId,
        channelId: channel.id,
        ical_import_url: icalUrl
      });
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        className="text-xs text-blue-600 hover:underline"
        onClick={onBack}
      >
        ← Back
      </button>

      <h2 className="text-sm font-semibold">
        Connect {channel.label}
      </h2>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          iCal Import URL (from {channel.label})
        </label>
        <input
          type="text"
          className="border rounded px-2 py-1 text-sm w-full"
          placeholder="https://..."
          value={icalUrl}
          onChange={(e) => setIcalUrl(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded">
          {error}
        </p>
      )}

      {!validated && (
        <button
          onClick={handleValidate}
          disabled={validating}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {validating ? "Validating..." : "Validate URL"}
        </button>
      )}

      {validated && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Connect Channel"}
        </button>
      )}
    </div>
  );
}