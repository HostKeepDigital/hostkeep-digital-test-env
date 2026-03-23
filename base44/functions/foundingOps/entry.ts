import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { op, ...params } = await req.json();

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