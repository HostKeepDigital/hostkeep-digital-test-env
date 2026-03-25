import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const members = await base44.asServiceRole.entities.FoundingMember.filter({
    approval_status: 'approved'
  });

  const hostCount = members.filter(m => m.role === 'host').length;
  const cleanerCount = members.filter(m => m.role === 'cleaner').length;

  return Response.json({ hostCount, cleanerCount });
});