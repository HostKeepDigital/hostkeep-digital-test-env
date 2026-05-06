/**
 * Automation handler: fires when a Message record is created.
 * Notifies the receiver in-app and by email.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = body;

    const { data } = payload;
    if (!data) return Response.json({ ok: true });

    const message = data;
    if (!message.receiver_id || !message.sender_id) return Response.json({ ok: true });

    // Don't notify system messages
    if (message.message_type === "system") return Response.json({ ok: true });

    const senderName = message.sender_name || "Someone";

    // Determine receiver's inbox link and fetch their email
    let messageLink = "/GuestMessages";
    let receiverEmail = null;

    try {
      const receiverUser = await serviceRole.entities.User.get(message.receiver_id);
      receiverEmail = receiverUser?.email || null;

      const roles = await serviceRole.entities.UserRole.filter({
        user_id: message.receiver_id,
        approval_status: "approved",
      });
      const isHost = roles.some((r) => r.role === "host");
      const isCleaner = roles.some((r) => r.role === "cleaner");
      if (isCleaner) messageLink = "/CleanKeep";
      else if (isHost) messageLink = "/HostMessages";
    } catch (_) {}

    await serviceRole.functions.invoke("sendNotification", {
      service_key: LOCK,
      user_id: message.receiver_id,
      type: "new_message",
      title: `New message from ${senderName}`,
      body: message.content?.slice(0, 200) || "You have a new message.",
      link: messageLink,
      email_to: receiverEmail,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onNewMessage error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
