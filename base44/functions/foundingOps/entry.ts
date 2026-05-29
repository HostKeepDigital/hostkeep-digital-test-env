import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, op, ...params } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ error: "Forbidden — admin only" }, { status: 403 });
    }
    const base44 = base44client;

    if (op === 'listMembers') {
      const members = await base44.asServiceRole.entities.FoundingMember.list();
      return Response.json({ members });
    }

    if (op === 'checkEmail') {
      const { email } = params;
      const existing = await base44.asServiceRole.entities.FoundingMember.filter({ email });
      const codes = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email, used: false });
      return Response.json({ existing, codes });
    }

    if (op === 'createMember') {
      const { data } = params;
      const member = await base44.asServiceRole.entities.FoundingMember.create(data);
      return Response.json({ member });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});