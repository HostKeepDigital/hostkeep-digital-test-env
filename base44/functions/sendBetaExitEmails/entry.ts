import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { beta_end_date } = await req.json();

    if (!beta_end_date) {
      return Response.json({ error: 'beta_end_date required' }, { status: 400 });
    }

    // Get all founding members (hosts and cleaners only)
    const foundingMembers = await base44.asServiceRole.entities.FoundingMember.filter({});
    
    const hostCleanerMembers = foundingMembers.filter(m => 
      ['host', 'cleaner'].includes(m.role)
    );

    // Send emails
    const emailsToSend = hostCleanerMembers.map(member => ({
      to: member.email,
      subject: 'HostKeep Beta Exit Notice — Your Founding Subscription Begins',
      body: `Hi ${member.full_name},

We're excited to announce that HostKeep is transitioning from beta on **${beta_end_date}**.

Your free founding membership trial will end on this date, and you'll automatically move to your locked-in founding subscription tier:
- **Founding Host Solo:** £19/month (unlimited properties)
- **Founding Host Multi:** £49/month (unlimited properties + advanced tools)
- **Founding Host Portfolio:** £89/month (dedicated support + analytics)
- **Founding Cleaner Solo:** £19/month (priority job matching)

**Your locked-in founding pricing is guaranteed for life** — thank you for being part of our journey!

If you have any questions, please contact support.

Best regards,
HostKeep Team`
    }));

    // Send each email
    let sentCount = 0;
    for (const email of emailsToSend) {
      try {
        await base44.integrations.Core.SendEmail({
          to: email.to,
          subject: email.subject,
          body: email.body,
          from_name: 'HostKeep'
        });
        sentCount++;
      } catch (e) {
        console.error(`Failed to send email to ${email.to}:`, e.message);
      }
    }

    // Update BetaSettings
    const settings = await base44.asServiceRole.entities.BetaSettings.list();
    if (settings.length) {
      await base44.asServiceRole.entities.BetaSettings.update(settings[0].id, {
        beta_end_date,
        emails_sent_at: new Date().toISOString(),
        emails_sent_count: sentCount,
      });
    } else {
      await base44.asServiceRole.entities.BetaSettings.create({
        beta_end_date,
        emails_sent_at: new Date().toISOString(),
        emails_sent_count: sentCount,
      });
    }

    return Response.json({ 
      success: true, 
      sentCount,
      totalMembers: hostCleanerMembers.length,
      betaEndDate: beta_end_date
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});