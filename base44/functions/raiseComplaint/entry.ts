import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { differenceInHours } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
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
    const booking = await base44.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user is guest or host on this booking
    if (user.id !== booking.guest_id && user.id !== booking.host_id) {
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
      await base44.entities.Booking.update(booking_id, { rental_frozen: true });
    } else if (raised_by === 'host') {
      await base44.entities.Booking.update(booking_id, { deposit_frozen: true });
    }

    // Create Complaint record
    const complaintData = {
      booking_id,
      raised_by,
      raised_by_user_id: user.id,
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

    const complaint = await base44.entities.Complaint.create(complaintData);

    // Send notification emails
    try {
      if (raised_by === 'guest') {
        // Email host
        await base44.functions.invoke('sendEmail', {
          to: booking.host_email || (await base44.asServiceRole.entities.User.get(booking.host_id))?.email,
          subject: `Guest Complaint Raised - Booking ${booking_id}`,
          body: `A complaint has been raised on booking ${booking_id}. The rental payment is frozen until this is resolved. HostKeep admin will be in touch.`,
        });
      } else if (raised_by === 'host') {
        // Email guest
        await base44.functions.invoke('sendEmail', {
          to: booking.guest_email,
          subject: `Damage Claim Raised - Booking ${booking_id}`,
          body: `Your host has raised a damage claim on your recent stay. Your security deposit is frozen until this is resolved. HostKeep admin will be in touch.`,
        });
      }

      // Email admin
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@hostkeep.co.uk';
      await base44.functions.invoke('sendEmail', {
        to: adminEmail,
        subject: `New Complaint - Booking ${booking_id}`,
        body: `A new complaint has been raised.\n\nComplaint ID: ${complaint.id}\nBooking ID: ${booking_id}\nRaised By: ${raised_by}\nComplaint Type: ${complaint.complaint_type}\nCategory: ${category}\nDescription: ${description}\n\nStatus: open`,
      });
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      // Don't fail the whole operation if emails fail
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