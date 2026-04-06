import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all subscriptions for hosts and cleaners
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({});
    const hostCleanerUsers = userRoles.filter(r => 
      ['host', 'cleaner'].includes(r.role) && r.approval_status === 'approved'
    ).map(r => r.user_id);

    // Get all subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.list();
    const hostCleanerSubs = allSubs.filter(s => hostCleanerUsers.includes(s.user_id));

    let migratedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const sub of hostCleanerSubs) {
      const userRole = userRoles.find(r => r.user_id === sub.user_id);
      const isBeta = sub.plan.includes('beta');
      
      if (isBeta) {
        // Already on beta, just ensure next_subscription is set
        if (!sub.next_subscription) {
          const defaultPlan = userRole.role === 'host' ? 'founding_host_solo' : 'founding_cleaner_solo';
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            next_subscription: defaultPlan
          });
          migratedCount++;
        }
      } else {
        // Migrate to beta with appropriate founding tier as next plan
        const betaPlan = userRole.role === 'host' ? 'beta_host_access' : 'beta_cleaner_access';
        const nextPlan = userRole.role === 'host' ? 'founding_host_solo' : 'founding_cleaner_solo';
        
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          plan: betaPlan,
          status: 'active',
          is_founding_member: true,
          price_monthly: 0,
          start_date: today,
          next_subscription: nextPlan,
          stripe_subscription_id: null
        });
        migratedCount++;
      }
    }

    return Response.json({
      success: true,
      migratedCount,
      totalHostCleaners: hostCleanerSubs.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});