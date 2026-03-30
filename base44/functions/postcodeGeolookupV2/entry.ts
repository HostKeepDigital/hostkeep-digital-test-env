import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

/**
 * Official UK Postcode Lookup via Postcodes.io
 * 
 * Flow:
 * 1. Normalize postcode (trim, uppercase, remove spaces)
 * 2. Check UKPostcode cache table first
 * 3. If not cached, call https://api.postcodes.io/postcodes/{postcode}
 * 4. Extract authoritative admin data
 * 5. Cache result
 * 6. Return structured data
 */

Deno.serve(async (req) => {
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

    // Extract postcode
    const rawPostcode = body.postcode;

    if (!rawPostcode || typeof rawPostcode !== "string") {
      return Response.json(
        { error: "Please enter a valid UK postcode." },
        { status: 400 },
      );
    }

    // Step 1: Normalize — trim, uppercase, remove all spaces
    const clean = rawPostcode.trim().toUpperCase().replace(/\s+/g, "");

    // Basic format check before hitting the API
    const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
    if (!POSTCODE_REGEX.test(clean)) {
      return Response.json(
        { success: false, error: "Please enter a valid UK postcode." },
        { status: 400 },
      );
    }

    // Formatted version with space (e.g. PL132JE → PL13 2JE)
    const formatted = clean.slice(0, -3) + " " + clean.slice(-3);

    // Step 2: Check cache in UKPostcode table
    const cached = await serviceRole.entities.UKPostcode.filter(
      { postcode: formatted },
      "-created_date",
      1,
    );

    if (cached && cached.length > 0) {
      const c = cached[0];
      return Response.json({
        success: true,
        source: "cache",
        postcode: formatted,
        postcode_clean: clean,
        postcode_district: c.postcode_district,
        postcode_area: c.postcode_area,
        latitude: c.latitude,
        longitude: c.longitude,
        county: c.county,
        district: c.postcode_district,
        parish: c.post_town,
        country: c.country,
      });
    }

    // Step 3: Call Postcodes.io — authoritative UK postcode API
    const apiResponse = await fetch(
      `https://api.postcodes.io/postcodes/${clean}`,
    );
    const apiData = await apiResponse.json();

    if (!apiResponse.ok || apiData.status !== 200 || !apiData.result) {
      return Response.json(
        { success: false, error: "Please enter a valid UK postcode." },
        { status: 400 },
      );
    }

    const r = apiData.result;

    // Step 4: Extract authoritative administrative data
    const county = r.admin_county || r.admin_district || "";
    const district = r.admin_district || "";
    const parish = r.parish || "";
    const country = r.country || "England";
    const latitude = r.latitude;
    const longitude = r.longitude;
    const postcodeDistrict = formatted.split(" ")[0]; // e.g. PL13
    const postcodeArea = postcodeDistrict.replace(/\d.*$/, ""); // e.g. PL

    // Step 5: Cache in UKPostcode table
    try {
      await serviceRole.entities.UKPostcode.create({
        postcode: formatted,
        postcode_district: postcodeDistrict,
        postcode_area: postcodeArea,
        post_town: district,
        county,
        country,
        latitude,
        longitude,
        accuracy: "postcode",
        source: "ons",
      });
    } catch (cacheErr) {
      console.log(
        `Cache write skipped for ${formatted}: ${cacheErr.message}`,
      );
    }

    // Step 6: Return structured authoritative data
    return Response.json({
      success: true,
      source: "postcodes.io",
      postcode: formatted,
      postcode_clean: clean,
      postcode_district: postcodeDistrict,
      postcode_area: postcodeArea,
      latitude,
      longitude,
      county,
      district,
      parish,
      country,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Postcode lookup service error: " + error.message,
      },
      { status: 500 },
    );
  }
});
