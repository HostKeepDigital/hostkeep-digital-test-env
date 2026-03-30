import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RADIUS_CHOICES = [5, 10, 25, 50];
const BATCH_COUNT = 3;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomTestCase() {
  const categories = [
    { name: "England", postcodes: ["SW1A 1AA", "M1 1AE", "YO1 7HP", "BR1 1LU", "GL50 1UL"] },
    { name: "Wales", postcodes: ["CF10 1AA", "SA1 3SN", "LL30 1AB", "NP20 1DD"] },
    { name: "Scotland", postcodes: ["EH1 1AA", "G1 1XQ", "IV1 1SY", "AB10 1AB"] },
    { name: "Northern Ireland", postcodes: ["BT1 1AA", "BT7 1NN", "BT48 6DQ"] },
    { name: "Rural", postcodes: ["TR21 0LL", "IV54 8XB", "LL45 2LT", "KW1 4YT"] }
  ];
  const category = randomFrom(categories);
  const postcode = randomFrom(category.postcodes);
  const radiusMiles = randomFrom(RADIUS_CHOICES);
  return { category: category.name, postcode, radiusMiles };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function lookupPostcode(postcode) {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");
  const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`);
  return res.json();
}

async function searchPartial(query) {
  const res = await fetch(
    `https://api.postcodes.io/postcodes?q=${encodeURIComponent(query)}`
  );
  return res.json();
}

async function lookupPlace(query) {
  const res = await fetch(
    `https://api.postcodes.io/places/${encodeURIComponent(query)}`
  );
  return res.json();
}

async function runSuite() {
  const logs = [];
  const summary = [];
  const batches = [];
  const log = (m) => logs.push(`${new Date().toISOString()} ${m}`);
  const pass = (section, extra = {}) =>
    summary.push({ section, status: "PASS", ...extra });
  const warn = (section, extra = {}) =>
    summary.push({ section, status: "WARN", ...extra });
  const fail = (section, error, extra = {}) =>
    summary.push({ section, status: "FAIL", error: String(error), ...extra });

  for (let i = 0; i < BATCH_COUNT; i++) {
    const pick = getRandomTestCase();
    const outward = pick.postcode.slice(0, 3);
    const batch = {
      index: i + 1,
      region: pick.category,
      postcode: pick.postcode,
      outward,
      radiusMiles: pick.radiusMiles,
      steps: [],
      ok: true
    };

    try {
      log(
        `🎯 [Batch ${batch.index}] Region=${batch.region} Postcode=${batch.postcode} Radius=${batch.radiusMiles}mi`
      );

      // 1) Full lookup
      const lookup = await lookupPostcode(batch.postcode);
      batch.steps.push({ name: "Full Lookup", status: lookup?.status });
      if (lookup?.status !== 200)
        throw new Error(
          `Lookup failed: ${batch.postcode} (${lookup?.status})`
        );
      const { latitude, longitude } = lookup.result || {};
      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number"
      )
        throw new Error("Missing coordinates");
      pass("Full Lookup", {
        batch: batch.index,
        postcode: batch.postcode
      });

      // 2) Partial search
      const search = await searchPartial(batch.outward);
      batch.steps.push({
        name: "Partial Search",
        outward: batch.outward,
        count: search?.result?.length || 0
      });
      if (
        search?.status !== 200 ||
        !Array.isArray(search?.result) ||
        search.result.length === 0
      )
        throw new Error(`Partial search empty for ${batch.outward}`);
      pass("Partial Search", {
        batch: batch.index,
        outward: batch.outward
      });

      // 3) Place lookup
      const places = [
        "London",
        "Edinburgh",
        "Cardiff",
        "Belfast",
        "Polperro",
        "Looe"
      ];
      const placeName = randomFrom(places);
      const place = await lookupPlace(placeName);
      batch.steps.push({
        name: "Place Lookup",
        place: placeName,
        status: place?.status
      });
      if (place?.status === 200) {
        pass("Place Lookup", {
          batch: batch.index,
          place: placeName
        });
      } else {
        warn("Place Lookup", {
          batch: batch.index,
          place: placeName,
          note: "404 acceptable for some places"
        });
      }

      // 4) Radius smoke test
      const props = [
        { id: 1, lat: latitude + 0.02, lng: longitude + 0.02 },
        { id: 2, lat: latitude + 1.0, lng: longitude + 1.0 }
      ];
      const inside = props.filter(
        (p) =>
          haversineMiles(latitude, longitude, p.lat, p.lng) <=
          batch.radiusMiles
      );
      batch.steps.push({
        name: "Radius",
        radiusMiles: batch.radiusMiles,
        insideIds: inside.map((p) => p.id)
      });
      if (
        !inside.some((p) => p.id === 1) ||
        inside.some((p) => p.id === 2)
      )
        throw new Error(
          `Radius expectations failed @ ${batch.radiusMiles}mi`
        );
      pass("Radius Math", {
        batch: batch.index,
        radiusMiles: batch.radiusMiles
      });
    } catch (e) {
      batch.ok = false;
      fail("Batch", e, {
        batch: batch.index,
        postcode: batch.postcode
      });
    }

    batches.push(batch);
  }

  const ok = summary.every(
    (s) => s.status === "PASS" || s.status === "WARN"
  );
  return { ok, batches, summary, logs };
}

function buildEmailBody({ ok, batches, summary }) {
  const lines = [];
  lines.push(`Postcode Test Results — ${new Date().toISOString()}`);
  lines.push(`Overall: ${ok ? "✅ PASS" : "❌ FAIL"}`);
  lines.push("");

  for (const b of batches) {
    lines.push(`Batch #${b.index}: ${b.ok ? "✅ OK" : "❌ FAILED"}`);
    lines.push(`  Region:   ${b.region}`);
    lines.push(`  Postcode: ${b.postcode}`);
    lines.push(`  Outward:  ${b.outward}`);
    lines.push(`  Radius:   ${b.radiusMiles} miles`);
    lines.push(`  Steps:    ${b.steps.map((s) => s.name).join(", ")}`);
    lines.push("");
  }

  lines.push("Summary:");
  for (const s of summary) {
    const parts = [];
    if (s.batch) parts.push(`batch=${s.batch}`);
    if (s.postcode) parts.push(`pc=${s.postcode}`);
    if (s.outward) parts.push(`out=${s.outward}`);
    if (s.radiusMiles) parts.push(`r=${s.radiusMiles}mi`);
    if (s.place) parts.push(`place=${s.place}`);
    if (s.error) parts.push(`error=${s.error}`);
    lines.push(
      `  [${s.status}] ${s.section}${
        parts.length ? " (" + parts.join(", ") + ")" : ""
      }`
    );
  }
  return lines.join("\n");
}

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
        { status: 401 }
      );
    }

    // Validate session using your new auth model
    const sessionCheck = await serviceRole.functions.invoke(
      "checkSession",
      { session_token }
    );

    const session = sessionCheck?.data;

    if (!session?.authenticated) {
      return Response.json(
        { error: "Invalid or expired session", authenticated: false },
        { status: 401 }
      );
    }

    // Run the test suite
    const result = await runSuite();
    const { ok, batches, summary, logs } = result;

    // Send email via Base44 SendEmail integration
    const emailBody = buildEmailBody({ ok, batches, summary });
    await base44.integrations.Core.SendEmail({
      to: "Admin@hostkeepdigital.co.uk",
      subject: `${ok ? "✅" : "❌"} Postcode Tests — ${new Date().toISOString()}`,
      body: emailBody
    });

    return Response.json({ ok, batches, summary, logs });
  } catch (error) {
    // Try to send error alert
    try {
      const base44 = createClientFromRequest(req);
      await base44.integrations.Core.SendEmail({
        to: "Admin@hostkeepdigital.co.uk",
        subject: `❌ Postcode Test Endpoint Error — ${new Date().toISOString()}`,
        body:
          `The postcode test endpoint threw an unexpected error:\n\n${error.message}\n\n${error.stack || ""}`
      });
    } catch (_) {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});