import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripeClient = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail({ to, subject, body }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'HostKeep Digital <hello@hostkeepdigital.co.uk>',
      to,
      subject,
      html: `<p>${body}</p>`,
    }),
  });
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, complaint_id, admin_resolution, admin_resolution_amount, admin_notes } = body;

    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sr = base44client.asServiceRole;
    const authenticatedUserId = session.user_id;
    if (!authenticatedUserId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const adminRoles = await sr.entities.UserRole.filter({ user_id: authenticatedUserId, role: 'admin' });
    if (!adminRoles?.[0]) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load complaint
    const complaint = await base44.entities.Complaint.get(complaint_id);
    if (!complaint) {
      return Response.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Load booking
    const booking = await base44.entities.Booking.get(complaint.booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Load host user
    const host = await base44.asServiceRole.entities.User.get(booking.host_id);
    if (!host?.stripe_connect_account_id) {
      return Response.json(
        { error: 'Host has not connected their bank account' },
        { status: 400 }
      );
    }

    // Execute Stripe actions
    const now = new Date();
    const bookingUpdate = {};
    let guestAmount = 0;
    let hostAmount = 0;

    try {
      if (admin_resolution === 'full_refund_to_guest') {
        await stripe.refunds.create({
          payment_intent: booking.stripe_rental_intent_id,
        });
        bookingUpdate.rental_payment_status = 'transferred';
        bookingUpdate.rental_frozen = false;
        guestAmount = booking.total_amount;
        hostAmount = 0;
      } else if (admin_resolution === 'partial_refund_to_guest') {
        await stripe.refunds.create({
          payment_intent: booking.stripe_rental_intent_id,
          amount: Math.round(admin_resolution_amount * 100),
        });
        await stripe.transfers.create({
          amount: Math.round((booking.total_amount - admin_resolution_amount) * 100),
          currency: 'gbp',
          destination: host.stripe_connect_account_id,
          metadata: { booking_id: booking.id },
        });
        bookingUpdate.rental_payment_status = 'transferred';
        bookingUpdate.rental_frozen = false;
        guestAmount = admin_resolution_amount;
        hostAmount = booking.total_amount - admin_resolution_amount;
      } else if (admin_resolution === 'released_to_host') {
        await stripe.transfers.create({
          amount: Math.round(booking.total_amount * 100),
          currency: 'gbp',
          destination: host.stripe_connect_account_id,
          metadata: { booking_id: booking.id },
        });
        bookingUpdate.rental_payment_status = 'transferred';
        bookingUpdate.rental_frozen = false;
        guestAmount = 0;
        hostAmount = booking.total_amount;
      } else if (admin_resolution === 'deposit_full_to_host') {
        await stripe.paymentIntents.capture(booking.stripe_deposit_intent_id);
        await stripe.transfers.create({
          amount: Math.round(booking.security_deposit * 100),
          currency: 'gbp',
          destination: host.stripe_connect_account_id,
          metadata: { booking_id: booking.id },
        });
        bookingUpdate.deposit_status = 'claimed';
        bookingUpdate.deposit_frozen = false;
        bookingUpdate.deposit_resolved_at = now.toISOString();
        hostAmount = booking.security_deposit;
      } else if (admin_resolution === 'deposit_partial_to_host') {
        await stripe.paymentIntents.capture(booking.stripe_deposit_intent_id, {
          amount_to_capture: Math.round(admin_resolution_amount * 100),
        });
        await stripe.transfers.create({
          amount: Math.round(admin_resolution_amount * 100),
          currency: 'gbp',
          destination: host.stripe_connect_account_id,
          metadata: { booking_id: booking.id },
        });
        bookingUpdate.deposit_status = 'claimed';
        bookingUpdate.deposit_frozen = false;
        bookingUpdate.deposit_resolved_at = now.toISOString();
        guestAmount = booking.security_deposit - admin_resolution_amount;
        hostAmount = admin_resolution_amount;
      } else if (admin_resolution === 'deposit_returned_to_guest') {
        await stripe.paymentIntents.cancel(booking.stripe_deposit_intent_id);
        bookingUpdate.deposit_status = 'returned';
        bookingUpdate.deposit_frozen = false;
        bookingUpdate.deposit_resolved_at = now.toISOString();
        guestAmount = booking.security_deposit;
        hostAmount = 0;
      }
    } catch (stripeError) {
      console.error('Stripe operation failed:', stripeError);
      return Response.json(
        { error: `Stripe error: ${stripeError.message}` },
        { status: 500 }
      );
    }

    // Update booking record
    await base44.entities.Booking.update(complaint.booking_id, bookingUpdate);

    // Update complaint record
    await base44.entities.Complaint.update(complaint_id, {
      status: 'resolved',
      admin_resolution,
      admin_resolution_amount,
      admin_notes,
      resolved_at: now.toISOString(),
      resolved_by: user.id,
    });

    // Check for account flags
    if (complaint.specific_issue === 'threatening_behaviour' || complaint.specific_issue === 'property_occupied') {
      await base44.asServiceRole.entities.User.update(booking.host_id, {
        account_flagged: true,
      });
    }

    // Send outcome emails
    try {
      const guestResolutionText =
        guestAmount > 0
          ? `You have been awarded £${guestAmount.toFixed(2)}`
          : 'No refund has been awarded';
      const hostResolutionText =
        hostAmount > 0
          ? `You have received £${hostAmount.toFixed(2)}`
          : 'No payment has been awarded';

      // Email guest
      await base44.functions.invoke('sendEmail', {
        to: booking.guest_email,
        subject: `Complaint Resolution - Booking ${complaint.booking_id}`,
        body: `Your complaint has been reviewed and resolved.\n\nResolution: ${admin_resolution}\n${guestResolutionText}\n\nAdmin notes: ${admin_notes || 'None'}\n\nIf you have any questions, please contact HostKeep support.`,
      });

      // Email host
      const hostEmail = host.email;
      await base44.functions.invoke('sendEmail', {
        to: hostEmail,
        subject: `Complaint Resolution - Booking ${complaint.booking_id}`,
        body: `A complaint on your booking has been reviewed and resolved.\n\nResolution: ${admin_resolution}\n${hostResolutionText}\n\nAdmin notes: ${admin_notes || 'None'}\n\nIf you have any questions, please contact HostKeep support.`,
      });
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      // Don't fail if emails fail
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('resolveComplaint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});