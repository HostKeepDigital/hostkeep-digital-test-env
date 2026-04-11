/**
 * Automation handler: fires when a Message record is created.
 * Notifies the receiver.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = await req.json();

    const { data } = payload;
    if (!data) return Response.json({ ok: true });

    const message = data;
    if (!message.receiver_id || !message.sender_id) return Response.json({ ok: true });

    // Don't notify system messages
    if (message.message_type === "system") return Response.json({ ok: true });

    // Get sender name
    let senderName = message.sender_name || "Someone";

    // Determine correct message inbox link based on receiver role
    let messageLink = "/GuestMessages";
    try {
      const receiverUser = await serviceRole.entities.User.get(message.receiver_id);
      const roles = await serviceRole.entities.UserRole.filter({ user_id: message.receiver_id, approval_status: "approved" });
      const isHost = roles.some((r) => r.role === "host");
      const isCleaner = roles.some((r) => r.role === "cleaner");
      if (isCleaner) messageLink = "/CleanKeep";
      else if (isHost) messageLink = "/HostMessages";
    } catch (_) {}

    await serviceRole.functions.invoke("sendNotification", {
      user_id: message.receiver_id,
      type: "new_message",
      title: `New message from ${senderName}`,
      body: message.content?.slice(0, 200) || "You have a new message.",
      link: messageLink,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onNewMessage error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});