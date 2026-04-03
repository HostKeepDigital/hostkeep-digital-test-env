import { useEffect, useState, useCallback } from "react";
import {
  getChannelListings,
  updateChannelListing,
  triggerChannelSync,
  getChannelSyncLogs
} from "../utils/api/channelManager";

export function useChannelListings(propertyId) {
  const [listings, setListings] = useState([]);
  const [logsByListing, setLogsByListing] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getChannelListings(propertyId);
      setListings(data.listings || []);
    } catch (err) {
      setError(err.message || "Failed to load channel listings");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const loadLogs = useCallback(
    async (channelListingId) => {
      try {
        const data = await getChannelSyncLogs(channelListingId);
        setLogsByListing((prev) => ({
          ...prev,
          [channelListingId]: data.logs || []
        }));
      } catch (err) {
        console.error("Failed to load sync logs", err);
      }
    },
    []
  );

  const saveListing = useCallback(async (id, payload) => {
    setError(null);
    try {
      const updated = await updateChannelListing(id, payload);
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updated.listing } : l))
      );
    } catch (err) {
      setError(err.message || "Failed to update listing");
      throw err;
    }
  }, []);

  const syncListing = useCallback(
    async (id) => {
      setSyncingId(id);
      setError(null);
      try {
        await triggerChannelSync(id);
        await loadLogs(id);
      } catch (err) {
        setError(err.message || "Failed to sync listing");
      } finally {
        setSyncingId(null);
      }
    },
    [loadLogs]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    listings,
    logsByListing,
    loading,
    syncingId,
    error,
    reload: load,
    loadLogs,
    saveListing,
    syncListing
  };
}