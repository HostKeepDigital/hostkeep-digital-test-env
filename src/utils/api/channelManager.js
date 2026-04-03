// Basic API helpers for Channel Manager

const BASE_PATH = "/functions/channelManager";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

// Get channel listings for a property
export async function getChannelListings(propertyId) {
  return jsonFetch(`/functions/getChannelListings`, {
    method: "POST",
    body: JSON.stringify({ propertyId })
  });
}

// Update a single ChannelListing
export async function updateChannelListing(id, payload) {
  return jsonFetch(`/functions/updateChannelListing`, {
    method: "POST",
    body: JSON.stringify({ id, ...payload })
  });
}

// Trigger manual iCal import for a listing
export async function triggerChannelSync(channelListingId) {
  return jsonFetch(`${BASE_PATH}/icalImport`, {
    method: "POST",
    body: JSON.stringify({ channelListingId })
  });
}

// Get CalendarSyncJob logs for a listing
export async function getChannelSyncLogs(channelListingId) {
  return jsonFetch(`/functions/getChannelSyncLogs`, {
    method: "POST",
    body: JSON.stringify({ channelListingId })
  });
}

export async function getConflicts(hostId) {
  return jsonFetch(`/functions/getConflicts`, {
    method: "POST",
    body: JSON.stringify({ hostId })
  });
}

export async function resolveConflict(channelBookingId) {
  return jsonFetch(`/functions/resolveConflict`, {
    method: "POST",
    body: JSON.stringify({ channelBookingId })
  });
}

export async function deleteChannelBooking(channelBookingId) {
  return jsonFetch(`/functions/deleteChannelBooking`, {
    method: "POST",
    body: JSON.stringify({ channelBookingId })
  });
}