import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { visitor_id, page, timestamp } = await req.json();
    if (!visitor_id || !page) return Response.json({ success: false });
    await base44.asServiceRole.entities.PageView.create({
      visitor_id,
      page,
      timestamp: timestamp || new Date().toISOString(),
    });
    return Response.json({ success: true });
  } catch (_) {
    return Response.json({ success: false });
  }
});