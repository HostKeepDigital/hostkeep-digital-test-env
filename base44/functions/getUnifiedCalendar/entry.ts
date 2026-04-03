import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id } = await req.json();

    if (!property_id) {
      return Response.json({ error: 'property_id is required' }, { status: 400 });
    }

    // Fetch internal bookings (confirmed/active)
    const internalBookings = await base44.asServiceRole.entities.Booking.filter({
      property_id,
      booking_status: { $nin: ['cancelled', 'declined', 'expired'] },
    });

    // Fetch channel bookings (external OTA)
    const channelBookings = await base44.asServiceRole.entities.ChannelBooking.filter({
      property_id,
    });

    // Fetch channel listings for this property
    const channelListings = await base44.asServiceRole.entities.ChannelListing.filter({
      property_id,
    });

    // Fetch all channels for label resolution
    const channels = await base44.asServiceRole.entities.Channel.list();
    const channelMap = Object.fromEntries(channels.map((c) => [c.id, c]));
    const listingMap = Object.fromEntries(channelListings.map((l) => [l.id, l]));

    // Build internal events
    const internal = internalBookings.map((b) => ({
      id: b.id,
      start_date: b.check_in,
      end_date: b.check_out,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      status: b.booking_status,
      source: 'internal',
    }));

    // Build external events
    const external = channelBookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => {
        const listing = listingMap[b.channel_listing_id];
        const channel = listing ? channelMap[listing.channel_id] : null;
        return {
          id: b.id,
          start_date: b.start_date,
          end_date: b.end_date,
          guest_name: b.guest_name || null,
          status: b.status,
          source: channel ? channel.key : 'external',
          channel_name: channel ? channel.name : 'External',
          channel_listing_id: b.channel_listing_id,
          external_reservation_id: b.external_reservation_id,
        };
      });

    // Blocked dates from property
    const property = await base44.asServiceRole.entities.Property.filter({ id: property_id });
    const blocked = (property[0]?.blocked_dates || []).map((date) => ({
      date,
      source: 'blocked',
    }));

    // Detect conflicts: internal bookings that overlap with external bookings
    const conflicts = [];

    for (const intBooking of internal) {
      const intStart = new Date(intBooking.start_date);
      const intEnd = new Date(intBooking.end_date);

      for (const extBooking of external) {
        const extStart = new Date(extBooking.start_date);
        const extEnd = new Date(extBooking.end_date);

        const overlaps = intStart < extEnd && intEnd > extStart;

        if (overlaps) {
          conflicts.push({
            internal_booking_id: intBooking.id,
            external_booking_id: extBooking.id,
            internal_start: intBooking.start_date,
            internal_end: intBooking.end_date,
            external_start: extBooking.start_date,
            external_end: extBooking.end_date,
            source: extBooking.source,
          });
        }
      }
    }

    return Response.json({ internal, external, blocked, conflicts });
  } catch (error) {
    console.error('getUnifiedCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});