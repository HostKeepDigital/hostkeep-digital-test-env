import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { differenceInHours } from 'npm:date-fns@3.6.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'hello@hostkeepdigital.co.uk';

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

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token } = body;

    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sr = base44client.asServiceRole;
    const authenticatedUserId = session.user_id;
    const isAdmin = session.role === 'admin';
    if (!authenticatedUserId && !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      booking_id,
      raised_by,
      category,
      specific_issue,
      description,
      evidence_urls,
      guest_situation,
      nights_stayed,
      requested_resolution,
      requested_amount,
      damage_items,
      damage_total_claimed,
    } = body;

    // Load booking
    const booking = await sr.entities.Booking.get(booking_id).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user is guest or host on this booking (admin can bypass)
      if (!isAdmin && authenticatedUserId !== booking.guest_id && authenticatedUserId !== booking.host_id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

    // Validate complaint window
    const now = new Date();

    if (raised_by === 'guest') {
      // Guest complaint window validation
      if (booking.rental_frozen) {
        return Response.json(
          { error: 'A complaint is already open on this booking' },
          { status: 400 }
        );
      }

      if (booking.rental_payment_status === 'transferred') {
        return Response.json(
          { error: 'The payment window has already closed' },
          { status: 400 }
        );
      }

      const rentalReleaseDueAt = new Date(booking.rental_release_due_at);
      if (now > rentalReleaseDueAt) {
        return Response.json(
          { error: 'The 24 hour complaint window has expired' },
          { status: 400 }
        );
      }
    } else if (raised_by === 'host') {
      // Host complaint window validation
      if (booking.deposit_frozen) {
        return Response.json(
          { error: 'A damage claim is already open on this booking' },
          { status: 400 }
        );
      }

      if (booking.deposit_status === 'returned' || booking.deposit_status === 'claimed') {
        return Response.json(
          { error: 'The deposit has already been returned to the guest' },
          { status: 400 }
        );
      }

      const checkOutDate = new Date(booking.check_out);
      const hoursSinceCheckOut = differenceInHours(now, checkOutDate);
      if (hoursSinceCheckOut > 48) {
        return Response.json(
          { error: 'The 48 hour damage claim window has expired' },
          { status: 400 }
        );
      }
    }

    // Freeze relevant payment
    if (raised_by === 'guest') {
      await sr.entities.Booking.update(booking_id, { rental_frozen: true });
    } else if (raised_by === 'host') {
      await sr.entities.Booking.update(booking_id, { deposit_frozen: true });
    }

    // Create Complaint record
    const complaintData = {
      booking_id,
      raised_by,
      raised_by_user_id: authenticatedUserId,
      complaint_type: raised_by === 'guest' ? 'rental_dispute' : 'damage_claim',
      category,
      specific_issue,
      description,
      evidence_urls: evidence_urls || [],
      requested_resolution,
      status: 'open',
    };

    if (raised_by === 'guest') {
      complaintData.guest_situation = guest_situation;
      complaintData.nights_stayed = nights_stayed;
      complaintData.requested_amount = requested_amount;
    } else if (raised_by === 'host') {
      complaintData.damage_items = damage_items || [];
      complaintData.damage_total_claimed = damage_total_claimed;
    }

    const complaint = await sr.entities.Complaint.create(complaintData);

    // Send notification emails
    // Send notification emails
    try {
      if (raised_by === 'guest') {
        const hostCreds = await sr.entities.UserCredentials.filter({ user_id: booking.host_id });
        const hostEmail = booking.host_email || hostCreds?.[0]?.email;
        if (hostEmail) {
          await sendEmail({
            to: hostEmail,
            subject: `Guest Complaint Raised — Booking ${booking_id}`,
            body: `A complaint has been raised on booking ${booking_id}. The rental payment is frozen until this is resolved. HostKeep admin will be in touch within 24 hours.`,
          });
        }
      } else if (raised_by === 'host') {
        if (booking.guest_email) {
          await sendEmail({
            to: booking.guest_email,
            subject: `Damage Claim Raised — Booking ${booking_id}`,
            body: `Your host has raised a damage claim on your recent stay. Your security deposit is frozen until this is resolved. HostKeep admin will be in touch within 24 hours.`,
          });
        }
      }

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Complaint — Booking ${booking_id}`,
        body: `A new complaint has been raised.<br><br>Complaint ID: ${complaint.id}<br>Booking ID: ${booking_id}<br>Raised By: ${raised_by}<br>Type: ${complaint.complaint_type}<br>Category: ${category}<br>Description: ${description}<br><br>Status: open`,
      });
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
    }

    return Response.json({
      success: true,
      complaint_id: complaint.id,
    });
  } catch (error) {
    console.error('raiseComplaint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});