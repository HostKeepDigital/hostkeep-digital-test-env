import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const CHANNEL_NAMES = {
  travelnest: "TravelNest",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  vrbo: "VRBO",
  expedia: "Expedia",
  homeaway: "HomeAway",
};

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { channel_booking_id, event_type = "new" } = body;

    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.service_key !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 200 });
    }

    if (!channel_booking_id) {
      return Response.json({ error: "missing_channel_booking_id" }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Load the channel booking
    const channelBooking = await serviceRole.entities.ChannelBooking.get(channel_booking_id);
    if (!channelBooking) {
      return Response.json({ error: "channel_booking_not_found" }, { status: 200 });
    }

    // Load the channel to get its display name
    let channelName = "External Channel";
    if (channelBooking.channel_id) {
      try {
        const channel = await serviceRole.entities.Channel.get(channelBooking.channel_id);
        channelName = CHANNEL_NAMES[channel?.key] || channel?.name || "External Channel";
      } catch (_) {}
    }

    // Load the property to find the host
    let hostId = null;
    try {
      const property = await serviceRole.entities.Property.get(channelBooking.property_id);
      hostId = property?.owner_id || null;
    } catch (_) {}

    if (!hostId) {
      return Response.json({ error: "host_not_found" }, { status: 200 });
    }

    // Build message content based on event type
    const isNew = event_type === "new";
    const isCancelled = event_type === "cancelled";

    const emoji = isNew ? "📅" : isCancelled ? "❌" : "🔄";
    const eventLabel = isNew ? "New booking" : isCancelled ? "Booking cancelled" : "Booking updated";

    const messageContent = [
      `${emoji} ${eventLabel} via ${channelName}`,
      `Guest: ${channelBooking.guest_name || "External guest"}`,
      `Dates: ${channelBooking.start_date} → ${channelBooking.end_date}`,
      channelBooking.external_reservation_id ? `Ref: ${channelBooking.external_reservation_id}` : null,
    ].filter(Boolean).join("\n");

    // Create the channel_notification message
    const conversationId = `channel_${channel_booking_id}`;

    await serviceRole.entities.Message.create({
      conversation_id: conversationId,
      property_id: channelBooking.property_id,
      sender_id: "system",
      sender_name: channelName,
      receiver_id: hostId,
      content: messageContent,
      message_type: "channel_notification",
      source_channel: channelBooking.channel_id,
      channel_booking_id: channel_booking_id,
      read: false,
    });

    // Fire in-app notification for the host
    try {
      let hostEmail = null;
      const hostUser = await serviceRole.entities.User.get(hostId);
      hostEmail = hostUser?.email || null;

      await serviceRole.functions.invoke("sendNotification", {
        service_key: LOCK,
        user_id: hostId,
        type: "booking_request",
        title: `${isNew ? "New" : isCancelled ? "Cancelled" : "Updated"} booking via ${channelName}`,
        body: `${channelBooking.guest_name || "A guest"}: ${channelBooking.start_date} → ${channelBooking.end_date}`,
        link: "/HostMessages",
        email_to: hostEmail,
      });
    } catch (_) {}

    return Response.json({ success: true, conversation_id: conversationId });
  } catch (err) {
    console.error("notifyChannelBooking error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});