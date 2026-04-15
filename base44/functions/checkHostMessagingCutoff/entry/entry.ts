import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HostKeep <hello@hostkeepdigital.co.uk>',
        to,
        subject,
        html,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { host_user_id } = body;

    if (!host_user_id) {
      return Response.json(
        { error: 'host_user_id is required' },
        { status: 400 }
      );
    }

    // Load user record
    const users = await base44.asServiceRole.entities.User.filter({
      id: host_user_id,
    });
    const user = users?.[0];

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If subscription is active, return immediately
    if (user.subscription_active) {
      return Response.json({
        success: true,
        messaging_closed: false,
        reason: 'Subscription is still active',
      });
    }

    // Load all properties for this user
    const properties = await base44.asServiceRole.entities.Property.filter({
      owner_id: host_user_id,
    });

    if (!properties || properties.length === 0) {
      // No properties, safe to disable messaging
      const userRoles = await base44.asServiceRole.entities.UserRole.filter({
        user_id: host_user_id,
        role: 'host',
      });

      if (userRoles && userRoles.length > 0) {
        const userRole = userRoles[0];
        await base44.asServiceRole.entities.UserRole.update(userRole.id, {
          messaging_disabled: true,
        });

        // Send email
        await sendEmail(
          user.email,
          'Your HostKeep Account is Fully Closed',
          `
            <h1>Account Closed</h1>
            <p>Hi ${user.full_name},</p>
            <p>Your HostKeep account has been fully closed and messaging is no longer available.</p>
            <p>If you have any questions, please contact us at hello@hostkeepdigital.co.uk</p>
          `
        );
      }

      return Response.json({
        success: true,
        messaging_closed: true,
      });
    }

    // Get all property IDs
    const propertyIds = properties.map((p) => p.id);

    // Load all bookings for these properties
    const bookings = await base44.asServiceRole.entities.Booking.filter({});

    // Filter bookings for the host's properties
    const hostBookings = bookings.filter((b) =>
      propertyIds.includes(b.property_id)
    );

    // Check if any booking has checkout within last 48 hours
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const bookingInDisputeWindow = hostBookings.some((b) => {
      if (!b.checkout_date) return false;
      const checkoutDate = new Date(b.checkout_date);
      return checkoutDate >= fortyEightHoursAgo && checkoutDate <= now;
    });

    if (bookingInDisputeWindow) {
      return Response.json({
        success: true,
        messaging_closed: false,
        reason: 'Bookings in dispute window',
      });
    }

    // Check for unresolved damage claims
    const complaints = await base44.asServiceRole.entities.Complaint.filter({});

    const unresolvedComplaints = complaints.some((c) => {
      const relatedToHostBooking = hostBookings.some((b) => b.id === c.booking_id);
      const isUnresolved = c.status && !c.status.includes('resolved') && c.status !== 'resolved';
      return relatedToHostBooking && isUnresolved;
    });

    if (unresolvedComplaints) {
      return Response.json({
        success: true,
        messaging_closed: false,
        reason: 'Unresolved complaints exist',
      });
    }

    // All checks passed - disable messaging
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({
      user_id: host_user_id,
      role: 'host',
    });

    if (userRoles && userRoles.length > 0) {
      const userRole = userRoles[0];
      await base44.asServiceRole.entities.UserRole.update(userRole.id, {
        messaging_disabled: true,
      });

      // Send email
      await sendEmail(
        user.email,
        'Your HostKeep Account is Fully Closed',
        `
          <h1>Account Closed</h1>
          <p>Hi ${user.full_name},</p>
          <p>Your HostKeep account has been fully closed and messaging is no longer available.</p>
          <p>If you have any questions, please contact us at hello@hostkeepdigital.co.uk</p>
        `
      );
    }

    return Response.json({
      success: true,
      messaging_closed: true,
    });
  } catch (error) {
    console.error('Error in checkHostMessagingCutoff:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});