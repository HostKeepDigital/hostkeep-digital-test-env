import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const { url } = await req.json();

    if (!url) {
      return Response.json(
        { success: false, error: "missing_url" },
        { status: 400 }
      );
    }

    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok || !text.includes("BEGIN:VCALENDAR")) {
      return Response.json(
        { success: false, error: "invalid_ical" },
        { status: 400 }
      );
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("validateIcalUrl error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});