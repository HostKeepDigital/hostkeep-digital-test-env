import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => { 
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { action } = body || {};

    if (!action) {
      return Response.json({ error: "missing_action" }, { status: 400 });
    }

    if (action === "create") {
      const { booking } = body;
      if (!booking) {
        return Response.json({ error: "missing_booking_fields" }, { status: 400 });
      }
      const created = await sr.entities.Booking.create(booking);
      return Response.json({ id: created.id });
    }

      if (action === "read") { 
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      const bookings = await sr.entities.Booking.filter({ id });
      return Response.json({ booking: bookings?.[0] || null });
    }

    if (action === "listNotifications") {
      const { user_id } = body;
      if (!user_id) {
        return Response.json({ error: "missing_user_id" }, { status: 400 });
      }
      const notifications = await sr.entities.Notification.filter({ user_id });
      return Response.json({ notifications });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.Booking.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "deleteNotification") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.Notification.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "createComplaint") {
      const { complaint } = body;
      if (!complaint) {
        return Response.json({ error: "missing_complaint_fields" }, { status: 400 });
      }
      const created = await sr.entities.Complaint.create(complaint);
      return Response.json({ id: created.id });
    }

    if (action === "readComplaint") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      const complaints = await sr.entities.Complaint.filter({ id });
      return Response.json({ complaint: complaints?.[0] || null });
    }

    if (action === "deleteComplaint") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.Complaint.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "createUserRole") {
      const { userRole } = body;
      if (!userRole) {
        return Response.json({ error: "missing_userRole_fields" }, { status: 400 });
      }
      const created = await sr.entities.UserRole.create(userRole);
      return Response.json({ id: created.id });
    }

    if (action === "deleteUserRole") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.UserRole.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "listNotificationsAndClean") {
      const { user_id, title_prefix } = body;
      if (!user_id || !title_prefix) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const notifications = await sr.entities.Notification.filter({ user_id });
      const toDelete = (notifications || []).filter((n) => n.title?.startsWith(title_prefix));
      await Promise.all(toDelete.map((n) => sr.entities.Notification.delete(n.id)));
      return Response.json({ deleted_count: toDelete.length });
    }

    if (action === "readUserRole") {
      const { user_id, role } = body;
      if (!user_id || !role) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const userRoles = await sr.entities.UserRole.filter({ user_id, role });
      return Response.json({ userRole: userRoles?.[0] || null });
    }

if (action === "createEmailVerificationCode") {
      const { email, code, expires_at } = body;
      if (!email || !code || !expires_at) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const created = await sr.entities.EmailVerificationCode.create({ email, code, expires_at, used: false });
      return Response.json({ id: created.id });
    }

    if (action === "readEmailVerificationCode") {
      const { email } = body;
      if (!email) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const records = await sr.entities.EmailVerificationCode.filter({ email });
      return Response.json({ record: records?.[0] || null, count: records?.length || 0 });
    }

    if (action === "deleteEmailVerificationCode") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.EmailVerificationCode.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "createUserCredentials") {
      const { userCredentials } = body;
      if (!userCredentials) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const created = await sr.entities.UserCredentials.create(userCredentials);
      return Response.json({ id: created.id });
    }

    if (action === "readUserCredentials") {
      const { email } = body;
      if (!email) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const records = await sr.entities.UserCredentials.filter({ email });
      return Response.json({ record: records?.[0] || null });
    }

    if (action === "deleteUserCredentials") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.UserCredentials.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "deleteUser") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.User.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === "deleteGuest") {
      const { email } = body;
      if (!email) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }
      const records = await sr.entities.Guest.filter({ email });
      await Promise.all((records || []).map(r => sr.entities.Guest.delete(r.id)));
      return Response.json({ deleted: true });
    }

    return Response.json({ error: "unrecognised_action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});