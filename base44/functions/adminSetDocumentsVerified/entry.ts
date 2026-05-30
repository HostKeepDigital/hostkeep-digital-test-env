import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const APP_URL = Deno.env.get("APP_URL") || "https://hostkeep-digital-test-env.base44.app";
const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");

const REJECTION_LABELS = {
  image_unclear: "Document image is too blurry or unclear to read",
  image_incomplete: "Document is cut off or partially obscured",
  image_glare: "Glare or reflections make the document unreadable",
  photocopy_not_accepted: "We require an original document, not a photocopy or scan",
  document_expired: "The document submitted has expired",
  document_type_not_accepted: "This document type is not accepted for verification",
  document_appears_altered: "The document appears to have been tampered with or altered",
  document_not_legible: "Text or details on the document cannot be verified",
  name_mismatch: "Name on the document does not match the name on your account",
  address_mismatch: "Address on the document does not match your stated address",
  photo_mismatch: "The photograph does not appear to match the account holder",
  property_not_in_operating_area: "The property postcode is not within our current operating area (Cornwall and Devon)",
  property_ownership_not_verified: "We were unable to verify ownership of the property from the documents provided",
  property_document_insufficient: "The property document provided does not meet our requirements",
  additional_id_required: "A second form of identification is required",
  proof_of_address_required: "A separate proof of address document is needed",
  proof_of_ownership_required: "Documentary evidence of property ownership is required",
  additional_information_required: "Please contact us — we need some additional information before we can proceed",
};

async function notify(user_id, type, title, body, link) {
  try {
    await fetch(`${APP_URL}/functions/sendNotification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_key: LOCK, user_id, type, title, body, link }),
    });
  } catch (e) {
    console.error("notify failed:", e?.message);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { session_token, user_id, email: emailParam, documents_verified, rejection_reason, rejection_notes } = body;
    // Auth — session required
    if (!session_token) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await base44.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (session.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (!user_id) {
      return Response.json({ success: false, error: "missing_user_id" }, { status: 400 });
    }

    // The User entity has no email field, so it is addressed by id. User.get() returns 404 in
    // all contexts here, so use filter({ id }) — the working pattern from onNewUserRole.
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = users?.[0];
    if (!user) {
      return Response.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(user_id, { documents_verified: !!documents_verified });
    if (documents_verified) {
      const stripeVerified = user?.stripe_verified || false;
      const subscriptionActive = user?.subscription_active || false;

      let notifBody = "Your documents have been verified.";

      if (!stripeVerified && !subscriptionActive) {
        notifBody = "Your documents have been verified. You still need to connect your Stripe account and activate your subscription before you can publish your property.";
      } else if (!stripeVerified) {
        notifBody = "Your documents have been verified. You still need to connect your Stripe account before you can publish your property.";
      } else if (!subscriptionActive) {
        notifBody = "Your documents have been verified. You still need to activate your subscription before you can publish your property.";
      }

      await notify(user_id, "general", "Documents verified ✅", notifBody, "/HostDashboard");

      // If all gates now open — send congratulations immediately after
      if (stripeVerified && subscriptionActive) {
        await notify(
          user_id,
          "general",
          "You're fully approved! 🎉",
          "Congratulations! All verification steps are complete. Your property can now be published to guests.",
          "/HostDashboard"
        );

        // Update FoundingMember and UserRole approval status
        const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id });
        if (members?.[0]) {
          await base44.asServiceRole.entities.FoundingMember.update(members[0].id, { approval_status: "approved" });
        }
        const roles = await base44.asServiceRole.entities.UserRole.filter({ user_id, role: "host" });
        if (roles?.[0]) {
          await base44.asServiceRole.entities.UserRole.update(roles[0].id, { approval_status: "approved" });
        }
      }
    } else {
      // Rejection — build reason text
      const reasonLabel = REJECTION_LABELS[rejection_reason] || rejection_reason || "Your documents could not be verified";
      const notesText = rejection_notes ? ` Additional notes: ${rejection_notes}.` : "";
      const notifBody = `Your documents were not accepted. Reason: ${reasonLabel}.${notesText} Please resubmit via your dashboard — you can do this immediately.`;

      await notify(user_id, "general", "Documents not accepted", notifBody, "/HostDashboard");

      // Update VerificationDocuments record with rejection reason
      try {
        const verDocs = await base44.asServiceRole.entities.VerificationDocuments.filter({ user_id });
        if (verDocs?.[0]) {
          await base44.asServiceRole.entities.VerificationDocuments.update(verDocs[0].id, {
            verification_status: "rejected",
            rejection_reason: rejection_reason || null,
          });
        }
      } catch (_) {}
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("adminSetDocumentsVerified error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});