/**
 * sendNotification — core notification utility
 * Creates an in-app Notification record and optionally sends an email
 * based on the recipient's notification_preferences on their User record.
 *
 * Payload:
 *   user_id     — recipient user ID
 *   type        — notification type (see Notification entity enum)
 *   title       — short title
 *   body        — body text
 *   link        — optional deep link path (e.g. "/HostBookings")
 *   email_to    — optional recipient email (if omitted, fetched from User record)
 *   force_email — if true, sends email regardless of preferences
 *   service_key — internal callers (automation handlers) pass LOCK_ACCESS_TOKEN
 *                 to bypass user session requirement
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Map notification types to user preference keys
const PREF_MAP = {
  booking_request: "bookings",
  booking_confirmed: "bookings",
  booking_declined: "bookings",
  booking_cancelled: "bookings",
  booking_checked_in: "bookings",
  booking_completed: "bookings",
  new_message: "messages",
  cleaning_job_assigned: "jobs",
  cleaning_job_accepted: "jobs",
  cleaning_job_declined: "jobs",
  cleaning_job_completed: "jobs",
  payment_received: "payments",
  payment_due: "payments",
  general: "general",
};

Deno.serve(async (req) => {
  try {
    const reqBody = await req.json().catch(() => ({}));
    const { session_token, service_key, user_id, type, title, body, link, email_to, force_email } = reqBody;

    // Auth: accept either a valid user session OR the internal service key
    const LOCK_TOKEN = Deno.env.get("LOCK_ACCESS_TOKEN");
    const isServiceCall = service_key && LOCK_TOKEN && service_key === LOCK_TOKEN;

    if (!isServiceCall) {
      if (!session_token) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const base44client = createClientFromRequest(req);
      const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
      const session = sessions?.[0];
      if (!session || new Date(session.expires_at) < new Date()) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const serviceRole = createClientFromRequest(req).asServiceRole;

    if (!user_id || !type || !title || !body) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    // Create in-app notification record
    await serviceRole.entities.Notification.create({
      user_id,
      type,
      title,
      body,
      link: link || null,
      read: false,
    });

    // Fetch user to check notification preferences and get email if not supplied
    let userRecord = null;
    try {
      userRecord = await serviceRole.entities.User.get(user_id);
    } catch (_) {}

    const prefs = userRecord?.notification_preferences || {};
    const prefKey = PREF_MAP[type] || "general";

    // Default: all preferences on (only off if explicitly set to false)
    const emailEnabled = force_email || (prefs[prefKey] !== false);
    const recipientEmail = email_to || userRecord?.email;

    if (emailEnabled && recipientEmail && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HostKeep <hello@hostkeepdigital.co.uk>",
          to: [recipientEmail],
          subject: title,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#1E3A5F;border-radius:8px;padding:16px 24px;margin-bottom:24px">
                <span style="color:white;font-size:20px;font-weight:700">HostKeep</span>
              </div>
              <h2 style="color:#111827;margin-bottom:8px">${title}</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.6">${body}</p>
              ${link ? `<a href="https://hostkeepdigital.co.uk${link}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#0d9488;color:white;border-radius:8px;text-decoration:none;font-weight:600">View Details</a>` : ""}
              <p style="color:#9ca3af;font-size:12px;margin-top:32px">You're receiving this because your notification preferences are enabled. <a href="https://hostkeepdigital.co.uk/Settings?tab=notifications" style="color:#0d9488">Manage preferences</a>.</p>
            </div>
          `,
        }),
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("sendNotification error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
