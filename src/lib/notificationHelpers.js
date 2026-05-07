const APP_ID = "698eee4108bd1d9467648326";

const callFn = async (name, body) => {
  try {
    await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_token: localStorage.getItem("session_token"),
        ...body,
      }),
    });
  } catch (_) {}
};

export const notifyBookingEvent = (bookingId, eventType, oldStatus = null) =>
  callFn("notifyBookingEvent", {
    booking_id: bookingId,
    event_type: eventType,
    old_status: oldStatus,
  });

export const notifyMessage = (receiverId, senderName, messageContent) =>
  callFn("sendNotification", {
    user_id: receiverId,
    type: "new_message",
    title: `New message from ${senderName}`,
    body: (messageContent || "").slice(0, 200) || "You have a new message.",
  });