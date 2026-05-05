import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { session_token, member_id, user_id } = body;

    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ error: "Forbidden — admin only" }, { status: 403 });
    }
    if (!member_id || !user_id) {
      return Response.json({ error: 'Missing member_id or user_id' }, { status: 400 });
    }

    // Delete VerificationDocuments
    const docs = await base44.asServiceRole.entities.VerificationDocuments.filter({ user_id });
    for (const doc of docs) {
      await base44.asServiceRole.entities.VerificationDocuments.delete(doc.id);
    }

    // Delete CleaningJobs, Bookings, Properties
    const props = await base44.asServiceRole.entities.Property.filter({ owner_id: user_id });
    for (const prop of props) {
      const jobs = await base44.asServiceRole.entities.CleaningJob.filter({ property_id: prop.id });
      for (const job of jobs) {
        await base44.asServiceRole.entities.CleaningJob.delete(job.id);
      }
      const bookings = await base44.asServiceRole.entities.Booking.filter({ property_id: prop.id });
      for (const booking of bookings) {
        await base44.asServiceRole.entities.Booking.delete(booking.id);
      }
      await base44.asServiceRole.entities.Property.delete(prop.id);
    }

    // Delete Messages
    const messages = await base44.asServiceRole.entities.Message.filter({ sender_id: user_id });
    for (const msg of messages) {
      await base44.asServiceRole.entities.Message.delete(msg.id);
    }

    // Delete FoundingMember
    await base44.asServiceRole.entities.FoundingMember.delete(member_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});