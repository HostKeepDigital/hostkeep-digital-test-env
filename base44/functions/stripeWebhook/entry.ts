import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = 'hello@hostkeepdigital.co.uk';

function buildEmail({ heading, body, buttonText, buttonUrl }) {
  const buttonBlock = buttonText && buttonUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td align="center">
            <a href="${buttonUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
              ${buttonText}
            </a>
          </td>
        </tr>
      </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HostKeep</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
              <img src="https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png" alt="HostKeep Digital" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1>
              <div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>
              ${buttonBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
                <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail({ to, subject, html }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'HostKeep Digital <hello@hostkeepdigital.co.uk>', to, subject, html }),
  });
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const connectWebhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');

const PLAN_DETAILS = {
  host_starter_monthly: { name: 'Host Starter', price: 29, max_properties: 1, role: 'host' },
  host_growth_monthly: { name: 'Host Growth', price: 59, max_properties: 5, role: 'host' },
  host_pro_monthly: { name: 'Host Pro', price: 99, max_properties: 999, role: 'host' },
  cleaner_solo_monthly: { name: 'Cleaner Solo', price: 9.99, max_properties: null, role: 'cleaner' },
  cleaner_pro_monthly: { name: 'Cleaner Pro', price: 19.99, max_properties: null, role: 'cleaner' },
  cleaner_team_monthly: { name: 'Cleaner Team', price: 39.99, max_properties: null, role: 'cleaner' },
  founding_host_solo: { name: 'Founding Host Solo', price: 19, max_properties: 1, role: 'host', is_founding: true },
  founding_host_multi: { name: 'Founding Host Multi', price: 49, max_properties: 5, role: 'host', is_founding: true },
  founding_host_portfolio: { name: 'Founding Host Portfolio', price: 89, max_properties: 999, role: 'host', is_founding: true },
  founding_cleaner_solo: { name: 'Founding Cleaner Solo', price: 9.99, max_properties: null, role: 'cleaner', is_founding: true },
};

async function handleSubscriptionDeactivated(base44, user_id) {
   try {
     // Mark User subscription_active = false
     await base44.asServiceRole.entities.User.update(user_id, { subscription_active: false });

     // Mark FoundingMember subscription_active = false
     // Mark FoundingMember subscription_active = false
     // Set stripe_verified gate on User
      await base44.asServiceRole.entities.User.update(userRole.user_id, {
        stripe_verified: true,
      });

     // Flip admin gate back to red
     try {
       await base44.asServiceRole.functions.invoke('checkApprovalGates', { user_id });
     } catch (_) {}

     // Mark Subscription record as expired
     try {
       const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
       if (subs?.[0]) {
         await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'expired' });
       }
     } catch (_) {}

     // Unpublish all published properties
     const properties = await base44.asServiceRole.entities.Property.filter({ owner_id: user_id, status: 'published' });
     for (const property of (properties || [])) {
       await base44.asServiceRole.entities.Property.update(property.id, { status: 'draft' });
     }

     // Send subscription expired email
     // Call checkApprovalGates so admin gate flips back to red
     try {
       await base44.asServiceRole.functions.invoke('checkApprovalGates', { user_id });
     } catch (_) {}

     // Update Subscription record status
     try {
       const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
       if (subs?.[0]) {
         await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'expired' });
       }
     } catch (_) {}

     // Send subscription expired email
     const userRecords = await base44.asServiceRole.entities.User.filter({ id: user_id });
     const user = userRecords?.[0];
     if (user?.email) {
       const html = buildEmail({
         heading: 'Your subscription has expired',
         body: `
           <p>Hi ${user.full_name?.split(' ')[0] || 'there'},</p>
           <p>Your HostKeep subscription has ended. As a result:</p>
           <ul style="padding-left:20px;line-height:1.8;">
             <li>Your properties have been moved to <strong>Draft</strong> and are no longer visible to guests.</li>
             <li>Any existing confirmed bookings will continue as normal and will not be affected.</li>
           </ul>
           <p>To republish your properties and continue accepting new bookings, simply resubscribe from your dashboard.</p>
           <p style="margin-top:24px;">If you have any questions, we're happy to help.</p>
           <p>Warm regards,<br/><strong>The HostKeep Digital Team</strong></p>
         `,
         buttonText: 'Resubscribe Now',
         buttonUrl: 'https://hostkeepdigital.co.uk/Subscription',
       });
       await sendEmail({ to: user.email, subject: 'Your HostKeep subscription has expired', html });
     }

     // Invoke messaging cutoff check
     await base44.asServiceRole.functions.invoke('checkHostMessagingCutoff', { host_user_id: user_id });
   } catch (err) {
     console.error('handleSubscriptionDeactivated error:', err);
   }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, connectWebhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }
  }

  const base44 = createClientFromRequest(req);

  // Idempotency — reject duplicate webhook events (replay attack prevention)
  try {
    const existing = await base44.asServiceRole.entities.AdminAlert.filter({ description: event.id });
    if (existing?.length > 0) {
      return Response.json({ received: true, duplicate: true });
    }
    await base44.asServiceRole.entities.AdminAlert.create({
      alert_type: "processed_webhook",
      description: event.id,
      created_by: "stripe_webhook",
    });
  } catch (_) {}

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, plan } = session.metadata || {};

    if (!user_id || !plan || !PLAN_DETAILS[plan]) {
      return Response.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const planDetails = PLAN_DETAILS[plan];
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const startDateStr = now.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
      const existingSub = subs[0];

      const subData = {
        plan,
        status: 'active',
        price_monthly: planDetails.price,
        max_properties: planDetails.max_properties,
        start_date: startDateStr,
        end_date: endDateStr,
        stripe_subscription_id: session.subscription,
        is_founding_member: planDetails.is_founding || false,
      };

      if (existingSub) {
        await base44.asServiceRole.entities.Subscription.update(existingSub.id, subData);
      } else {
        await base44.asServiceRole.entities.Subscription.create({ user_id, ...subData });
      }

      // Ensure the correct role exists
      const requiredRole = planDetails.role;
      const roles = await base44.asServiceRole.entities.UserRole.filter({ user_id });
      const hasRole = roles.some(r => r.role === requiredRole && r.approval_status === 'approved');
      if (!hasRole) {
        const existing = roles.find(r => r.role === requiredRole);
        if (existing) {
          await base44.asServiceRole.entities.UserRole.update(existing.id, { approval_status: 'approved' });
        } else {
          await base44.asServiceRole.entities.UserRole.create({ user_id, role: requiredRole, approval_status: 'approved' });
        }
      }

      // Set subscription_active on FoundingMember so the gate turns green
      try {
        const foundingMembers = await base44.asServiceRole.entities.FoundingMember.filter({ user_id });
        if (foundingMembers?.[0]) {
          await base44.asServiceRole.entities.FoundingMember.update(foundingMembers[0].id, {
            subscription_active: true,
          });
        }
      } catch (_) {}

      // Apply referral reward if this user was referred
      try {
        const userEmail = session.customer_details?.email;
        if (userEmail) {
          const refs = await base44.asServiceRole.entities.Referral.filter({ referee_email: userEmail.toLowerCase().trim() });
          if (refs.length > 0 && refs[0].status === "pending") {
            await base44.asServiceRole.functions.invoke("applyReferralReward", {
              referee_user_id: user_id || null,
              referee_email: userEmail,
            });
          }
        }
      } catch (_) {}

      // Send subscription confirmation email to host
      const hostEmail = session.customer_details?.email;
      const hostName = session.customer_details?.name || 'there';
      const invoiceDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const nextBillingDate = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      if (hostEmail) {
        const hostHtml = buildEmail({
          heading: `You're subscribed to HostKeep Digital! 🎉`,
          body: `
            <p>Hi ${hostName.split(' ')[0]},</p>
            <p>Thank you for subscribing to <strong>HostKeep Digital</strong>. Your subscription is now active and you have full access to your plan.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr style="background-color:#f9fafb;">
                <td colspan="2" style="padding:14px 20px;font-size:13px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Subscription Invoice</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Invoice Date</td>
                <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;border-top:1px solid #e5e7eb;text-align:right;">${invoiceDate}</td>
              </tr>
              <tr style="background-color:#f9fafb;">
                <td style="padding:12px 20px;font-size:14px;color:#6b7280;">Plan</td>
                <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${planDetails.name}</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Billing Period</td>
                <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;border-top:1px solid #e5e7eb;text-align:right;">${startDateStr} – ${endDateStr}</td>
              </tr>
              <tr style="background-color:#f9fafb;">
                <td style="padding:12px 20px;font-size:14px;color:#6b7280;">Next Billing Date</td>
                <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${nextBillingDate}</td>
              </tr>
              <tr style="background-color:#0d9488;">
                <td style="padding:14px 20px;font-size:15px;font-weight:bold;color:#ffffff;">Amount Charged</td>
                <td style="padding:14px 20px;font-size:15px;font-weight:bold;color:#ffffff;text-align:right;">£${planDetails.price.toFixed(2)} / month</td>
              </tr>
            </table>

            <p>You can manage your subscription at any time from the <strong>Subscription</strong> page in your dashboard.</p>
            <p>If you have any questions, our team is always happy to help.</p>
            <p style="margin-top:24px;">Warm regards,<br/><strong>The HostKeep Digital Team</strong></p>
          `,
          buttonText: 'Go to Your Dashboard',
          buttonUrl: 'https://hostkeepdigital.co.uk/HostDashboard',
        });

        await sendEmail({
          to: hostEmail,
          subject: `Subscription Confirmed — ${planDetails.name} Plan`,
          html: hostHtml,
        });
      }

      // Send admin notification email
      const adminHtml = buildEmail({
        heading: `New Subscriber — ${planDetails.name}`,
        body: `
          <p>A new subscriber has joined HostKeep Digital.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
            <tr style="background-color:#f9fafb;">
              <td colspan="2" style="padding:14px 20px;font-size:13px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Subscriber Details</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Name</td>
              <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;border-top:1px solid #e5e7eb;text-align:right;">${session.customer_details?.name || 'N/A'}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:12px 20px;font-size:14px;color:#6b7280;">Email</td>
              <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${hostEmail || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Plan</td>
              <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;border-top:1px solid #e5e7eb;text-align:right;">${planDetails.name}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:12px 20px;font-size:14px;color:#6b7280;">Monthly Value</td>
              <td style="padding:12px 20px;font-size:14px;color:#111827;font-weight:600;text-align:right;">£${planDetails.price.toFixed(2)}</td>
            </tr>
            <tr style="background-color:#0d9488;">
              <td style="padding:14px 20px;font-size:15px;font-weight:bold;color:#ffffff;">Date</td>
              <td style="padding:14px 20px;font-size:15px;font-weight:bold;color:#ffffff;text-align:right;">${invoiceDate}</td>
            </tr>
          </table>

          <p>View and manage this subscriber from the Admin Panel.</p>
        `,
        buttonText: 'Open Admin Panel',
        buttonUrl: 'https://hostkeepdigital.co.uk/admin',
      });

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🎉 New Subscriber: ${planDetails.name} — ${session.customer_details?.name || hostEmail}`,
        html: adminHtml,
      });

      return Response.json({ received: true });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const { user_id } = session.metadata || {};
    if (user_id) {
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
        const sub = subs.find(s => s.status === 'pending');
        if (sub) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, { status: 'expired' });
        }
      } catch (_) {}
    }
    return Response.json({ received: true });
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const stripeSubscriptionId = invoice.subscription;
    if (stripeSubscriptionId) {
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSubscriptionId });
        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'expired' });
        }
      } catch (_) {}
    }
    return Response.json({ received: true });
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { user_id } = subscription.metadata || {};
    if (user_id) {
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'cancelled' });
        }
        await handleSubscriptionDeactivated(base44, user_id);
      } catch (err) {
        console.error('customer.subscription.deleted handler error:', err);
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { booking_id, type } = pi.metadata || {};
    if (booking_id) {
      const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
      const booking = bookings?.[0];
      if (booking) {
        const update = {};
        if (type === 'rental') {
          update.rental_payment_status = 'held';
        } else if (type === 'security_deposit') {
          update.deposit_status = 'held';
        }
        if (booking.booking_status === 'awaiting_payment') {
          update.booking_status = 'confirmed';
        }
        await base44.asServiceRole.entities.Booking.update(booking_id, update);
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    const { booking_id } = pi.metadata || {};
    if (booking_id) {
      await base44.asServiceRole.entities.Booking.update(booking_id, {
        booking_status: 'awaiting_payment',
        rental_payment_status: 'unpaid',
      });
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const stripeSubscriptionId = invoice.subscription;
    if (stripeSubscriptionId) {
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSubscriptionId });
        const sub = subs?.[0];
        if (sub && sub.status === 'active') {
           const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id: sub.user_id });
           if (members?.[0]) {
             await base44.asServiceRole.entities.FoundingMember.update(members[0].id, { subscription_active: true });
           }
           await base44.asServiceRole.entities.User.update(sub.user_id, { subscription_active: true });
           await base44.asServiceRole.functions.invoke('checkApprovalGates', { user_id: sub.user_id });
         }
      } catch (err) {
        console.error('invoice.payment_succeeded handler error:', err);
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const { user_id } = subscription.metadata || {};
    if (user_id) {
      try {
        if (subscription.status === 'active') {
           const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id });
           if (members?.[0]) {
             await base44.asServiceRole.entities.FoundingMember.update(members[0].id, { subscription_active: true });
           }
           await base44.asServiceRole.entities.User.update(user_id, { subscription_active: true });
           await base44.asServiceRole.functions.invoke('checkApprovalGates', { user_id });

           // Apply referral reward if this user was referred
           try {
             const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
             const userEmail = users?.[0]?.email;
             if (userEmail) {
               const refs = await base44.asServiceRole.entities.Referral.filter({ referee_email: userEmail.toLowerCase().trim() });
               if (refs.length > 0 && refs[0].status === "pending") {
                 await base44.asServiceRole.functions.invoke("applyReferralReward", {
                   referee_user_id: user_id,
                   referee_email: userEmail,
                 });
               }
             }
           } catch (_) {}
         } else if (subscription.status === 'canceled' || subscription.status === 'past_due') {
           await handleSubscriptionDeactivated(base44, user_id);
         }
      } catch (err) {
        console.error('customer.subscription.updated handler error:', err);
      }
    }
  }

  // account.updated — Stripe fires this when a Connect Express host completes onboarding.
  // stripe_connect_account_id is stored on UserRole (host role record).
  if (event.type === 'account.updated') {
    const account = event.data.object;
    if (account.charges_enabled) {
      try {
        const roles = await base44.asServiceRole.entities.UserRole.filter({ stripe_connect_account_id: account.id });
        const userRole = roles?.[0];
        if (userRole) {
          // Update stripe status on UserRole
          await base44.asServiceRole.entities.UserRole.update(userRole.id, {
            stripe_connect_status: 'verified',
          });

          // Update stripe flags on User
          await base44.asServiceRole.entities.User.update(userRole.user_id, {
            stripe_connect_status: 'verified',
            stripe_verified: true,
          });

          // Update FoundingMember stripe_verified gate
          const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id: userRole.user_id });
          if (members?.[0]) {
            await base44.asServiceRole.entities.FoundingMember.update(members[0].id, { stripe_verified: true });
          }

          // Check all approval gates
          await base44.asServiceRole.functions.invoke('checkApprovalGates', { user_id: userRole.user_id });
        }
      } catch (err) {
        console.error('account.updated handler error:', err);
      }
    }
  }

  return Response.json({ received: true });
});