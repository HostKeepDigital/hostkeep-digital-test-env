import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

/**
 * PostCode Geolookup - Returns approximate coordinates for UK postcodes
 * Uses hardcoded postcode area centroids
 */

// UK Postcode Area Centroids (unchanged)
const POSTCODE_AREAS = {
  /* ... your entire mapping stays exactly the same ... */
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Extract session token
    const body = await req.json().catch(() => ({}));
    const session_token =
      body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json(
        { error: "Missing session token", authenticated: false },
        { status: 401 },
      );
    }

    // Validate session using your new auth model
    const sessionCheck = await serviceRole.functions.invoke(
      "checkSession",
      { session_token },
    );

    const session = sessionCheck?.data;

    if (!session?.authenticated) {
      return Response.json(
        { error: "Invalid or expired session", authenticated: false },
        { status: 401 },
      );
    }

    // Extract postcode from body
    const { postcode } = body;

    if (!postcode || typeof postcode !== "string") {
      return Response.json(
        {
          error: "Postcode required",
          status: 400,
        },
        { status: 400 },
      );
    }

    // Normalize and validate postcode format
    const normalized = postcode.trim().toUpperCase();
    const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

    if (!POSTCODE_REGEX.test(normalized)) {
      return Response.json(
        {
          error: "Invalid UK postcode format",
          details: "Must be valid UK postcode (e.g., SW1A 1AA)",
          postcode: normalized,
          status: 400,
        },
        { status: 400 },
      );
    }

    // Extract postcode area
    const areaMatch = normalized.match(/^([A-Z]{1,2})([0-9])?/);
    if (!areaMatch) {
      return Response.json(
        {
          error: "Could not parse postcode area",
          postcode: normalized,
          status: 400,
        },
        { status: 400 },
      );
    }

    let areaCode = areaMatch[1];

    // Special handling for London postcodes
    const londonMatch = normalized.match(/^([A-Z]{1,2})([0-9]{1,2})/);
    if (
      londonMatch &&
      ["E", "N", "NW", "SE", "SW", "W", "WC", "EC"].includes(londonMatch[1])
    ) {
      areaCode = londonMatch[1];
    }

    const locationData = POSTCODE_AREAS[areaCode];

    if (!locationData) {
      return Response.json(
        {
          error: "Postcode area not recognized",
          details:
            `Area code '${areaCode}' from postcode '${normalized}' not found in database`,
          postcode: normalized,
          status: 400,
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      postcode: normalized,
      geolocation: {
        lat: locationData.lat,
        lng: locationData.lng,
        area: locationData.area,
        accuracy: "postcode-area",
      },
      instructions:
        "Use these coordinates to search uk_locations. User can adjust on map.",
    });
  } catch (error) {
    console.error("Postcode lookup error:", error);
    return Response.json(
      {
        error: "Postcode lookup failed",
        details: error.message,
        status: 500,
      },
      { status: 500 },
    );
  }
});
