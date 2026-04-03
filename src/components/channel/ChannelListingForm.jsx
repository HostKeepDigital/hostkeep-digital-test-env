import { useState } from "react";

export function ChannelListingForm({
  listing,
  onSave,
  onSync,
  syncing,
  exportBaseUrl
}) {
  const [icalImportUrl, setIcalImportUrl] = useState(
    listing.ical_import_url || ""
  );
  const [status, setStatus] = useState(listing.status || "active");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportUrl = `${exportBaseUrl}?token=${listing.ical_export_token}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(listing.id, {
        ical_import_url: icalImportUrl,
        status
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            {listing.channel_name || "Channel"}
          </h3>
          <p className="text-xs text-gray-500">
            Property ID: {listing.property_id}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          iCal Import URL (from Airbnb / Booking.com / VRBO)
        </label>
        <input
          type="text"
          className="w-full border rounded px-2 py-1 text-sm"
          value={icalImportUrl}
          onChange={(e) => setIcalImportUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          HostKeep iCal Export URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            className="flex-1 border rounded px-2 py-1 text-xs bg-gray-50"
            value={exportUrl}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-gray-200"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          Paste this into your OTA&apos;s calendar export settings.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => onSync(listing.id)}
          disabled={syncing}
          className="px-3 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-60"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
    </div>
  );
}