import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public read of beta_open flag — no auth required
    const settings = await base44.asServiceRole.entities.BetaSettings.list();
    
    if (settings.length) {
      return Response.json(settings[0]);
    }

    return Response.json({ beta_end_date: null, emails_sent_count: 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});