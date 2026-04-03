import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useChannelListings } from "../../hooks/useChannelListings";
import { ChannelListingForm } from "../../components/channel/ChannelListingForm";
import { ChannelSyncLogs } from "../../components/channel/ChannelSyncLogs";

export default function ChannelManagerPage() {
  const [params] = useSearchParams();
  const propertyId = params.get("propertyId"); // e.g. /admin/channels?propertyId=...

  const {
    listings,
    logsByListing,
    loading,
    syncingId,
    error,
    reload,
    loadLogs,
    saveListing,
    syncListing
  } = useChannelListings(propertyId);

  useEffect(() => {
    if (listings.length > 0) {
      listings.forEach((l) => loadLogs(l.id));
    }
  }, [listings, loadLogs]);

  const exportBaseUrl =
    window.location.origin + "/functions/channelManager/icalExport";

  if (!propertyId) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold mb-2">Channel Manager</h1>
        <p className="text-sm text-gray-600">
          No property selected. Pass <code>?propertyId=...</code> in the URL.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Channel Manager</h1>
          <p className="text-xs text-gray-500">
            Manage OTA calendar connections for property {propertyId}.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="px-3 py-1 text-xs rounded border bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-gray-500">Loading channel listings…</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {listings.map((listing) => (
          <div key={listing.id} className="space-y-3">
            <ChannelListingForm
              listing={listing}
              onSave={saveListing}
              onSync={syncListing}
              syncing={syncingId === listing.id}
              exportBaseUrl={exportBaseUrl}
            />
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-semibold mb-1">Sync activity</p>
              <ChannelSyncLogs logs={logsByListing[listing.id]} />
            </div>
          </div>
        ))}
      </div>

      {listings.length === 0 && !loading && (
        <p className="text-xs text-gray-500">
          No channel listings found for this property yet.
        </p>
      )}
    </div>
  );
}