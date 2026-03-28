import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const member_id = body?.member_id;

    if (!member_id) {
      return Response.json({ success: false, error: "missing_member_id" }, { status: 400 });
    }

    const member = await base44.asServiceRole.entities.FoundingMember.get(member_id);
    if (!member) {
      return Response.json({ success: false, error: "member_not_found" }, { status: 404 });
    }

    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: "invited",
    });

    return Response.json({ success: true });

  } catch (err) {
    console.error("promoteUserToInvited error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});