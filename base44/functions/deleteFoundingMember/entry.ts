import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { member_id, user_id } = await req.json();
    if (!member_id) {
      return Response.json({ error: 'Missing member_id' }, { status: 400 });
    }

    // Only delete user-related records if user_id exists (member may not have completed onboarding)
    if (user_id) {
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
    }

    // Delete FoundingMember
    await base44.asServiceRole.entities.FoundingMember.delete(member_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});