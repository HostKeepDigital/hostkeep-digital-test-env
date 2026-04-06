import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.BetaSettings.list();
    
    if (settings.length) {
      return Response.json(settings[0]);
    }

    return Response.json({ beta_end_date: null, emails_sent_count: 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});