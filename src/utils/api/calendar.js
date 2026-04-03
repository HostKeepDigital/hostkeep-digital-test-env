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

/* ----------------------------------------
   UNIFIED CALENDAR ENDPOINT
----------------------------------------- */

export async function getUnifiedCalendar(propertyId) {
  return jsonFetch(`${BASE_PATH}/getUnifiedCalendar`, {
    method: "POST",
    body: JSON.stringify({ propertyId })
  });
}