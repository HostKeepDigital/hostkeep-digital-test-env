import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { session_token, document_type, file_url, user_name, user_email } = body || {};

    if (!session_token) {
      return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    // Validate session
    const sessions = await sr.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    const user_id = session.user_id;

    if (!document_type || !file_url) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    // Step 1 — Create VerificationDocuments record
    const record = await sr.entities.VerificationDocuments.create({
      user_id,
      document_type,
      file_url,
      verification_status: "pending",
    });

    // Step 2 — Notify admin
    const adminRoles = await sr.entities.UserRole.filter({ role: "admin" });
    if (adminRoles?.length > 0) {
      const adminUserId = adminRoles[0].user_id;
      const serviceKey = Deno.env.get("LOCK_ACCESS_TOKEN");
      const formattedType = document_type.replace(/_/g, " ");

      await sr.functions.invoke("sendNotification", {
        service_key: serviceKey,
        user_id: adminUserId,
        type: "general",
        title: "New verification document uploaded",
        body: `A ${formattedType} document has been uploaded and is awaiting review.`,
        link: "/AdminPanel",
      });
    }

    return Response.json({ success: true, id: record.id });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});