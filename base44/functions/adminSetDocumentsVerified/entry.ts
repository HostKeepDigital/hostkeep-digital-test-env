import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { user_id, documents_verified } = await req.json();

    if (!user_id) {
      return Response.json({ success: false, error: "missing_user_id" }, { status: 400 });
    }

    // Update User entity with service role
    await base44.asServiceRole.entities.User.update(user_id, { documents_verified: !!documents_verified });

    // Update FoundingMember where user_id matches
    const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id });
    if (members?.[0]) {
      await base44.asServiceRole.entities.FoundingMember.update(members[0].id, { documents_verified: !!documents_verified });
    }

    // Trigger approval gate check
    await base44.asServiceRole.functions.invoke("checkApprovalGates", { user_id });

    return Response.json({ success: true });
  } catch (err) {
    console.error("adminSetDocumentsVerified error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});