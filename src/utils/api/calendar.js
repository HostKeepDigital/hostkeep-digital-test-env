const BASE_PATH = "/functions";

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

/* -----------------------------
   CHANNEL LISTING CRUD
------------------------------ */

export async function createChannelListing(payload) {
  return jsonFetch(`${BASE_PATH}/createChannelListing`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateChannelListing(id, updates) {
  return jsonFetch(`${BASE_PATH}/updateChannelListing`, {
    method: "POST",
    body: JSON.stringify({ id, ...updates })
  });
}

export async function getChannelListings(propertyId) {
  return jsonFetch(`${BASE_PATH}/getChannelListings`, {
    method: "POST",
    body: JSON.stringify({ propertyId })
  });
}

/* -----------------------------
   VALIDATION
------------------------------ */

export async function validateIcalUrl(url) {
  return jsonFetch(`${BASE_PATH}/validateIcalUrl`, {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

/* -----------------------------
   SYNC
------------------------------ */

export async function triggerChannelSync(channelListingId) {
  return jsonFetch(`${BASE_PATH}/syncChannel`, {
    method: "POST",
    body: JSON.stringify({ channelListingId })
  });
}

export async function getChannelSyncLogs(channelListingId) {
  return jsonFetch(`${BASE_PATH}/getChannelSyncLogs`, {
    method: "POST",
    body: JSON.stringify({ channelListingId })
  });
}

/* -----------------------------
   TOKEN REGENERATION
------------------------------ */

export async function regenerateExportToken(channelListingId) {
  return jsonFetch(`${BASE_PATH}/regenerateExportToken`, {
    method: "POST",
    body: JSON.stringify({ channelListingId })
  });
}

/* -----------------------------
   CONFLICTS
------------------------------ */

export async function getConflicts(hostId) {
  return jsonFetch(`${BASE_PATH}/getConflicts`, {
    method: "POST",
    body: JSON.stringify({ hostId })
  });
}

export async function resolveConflict(channelBookingId) {
  return jsonFetch(`${BASE_PATH}/resolveConflict`, {
    method: "POST",
    body: JSON.stringify({ channelBookingId })
  });
}

export async function deleteChannelBooking(channelBookingId) {
  return jsonFetch(`${BASE_PATH}/deleteChannelBooking`, {
    method: "POST",
    body: JSON.stringify({ channelBookingId })
  });
}

/* -----------------------------
   OVERVIEW
------------------------------ */

export async function getChannelOverview(hostId) {
  return jsonFetch(`${BASE_PATH}/getChannelOverview`, {
    method: "POST",
    body: JSON.stringify({ hostId })
  });
}