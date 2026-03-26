import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Support GET (admin link click) and POST (programmatic)
    let member_id;

    if (req.method === "GET") {
      const url = new URL(req.url);
      member_id = url.searchParams.get("member_id");
    } else {
      const body = await req.json();
      member_id = body.member_id;
    }

    if (!member_id) {
      return Response.json({ error: "Missing member_id" }, { status: 400 });
    }

    // Fetch the FoundingMember record
    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      id: member_id,
    });

    if (!members || members.length === 0) {
      return new Response(
        `<html><body><h2>FoundingMember not found.</h2></body></html>`,
        {
          headers: { "Content-Type": "text/html" },
          status: 404,
        }
      );
    }

    const member = members[0];

    // Approve the FoundingMember
    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: "approved",
    });

    // Send approval email to the invited user
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: member.email,
      subject: "Your HostKeep application has been approved!",
      body: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0d9488;">You're approved! 🎉</h2>
          <p>Hi ${member.full_name || "there"},</p>
          <p>Your HostKeep application has been reviewed and approved.</p>
          <p>To activate your account, please create your password:</p>

          <a href="https://hostkeepdigital.co.uk/CreatePassword?email=${encodeURIComponent(
            member.email
          )}"
             style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
            Create Your Password
          </a>

          <p style="margin-top:24px;color:#6b7280;font-size:14px;">
            Welcome to HostKeep — we're excited to have you onboard!
          </p>
        </div>
      `,
    });

    // Admin confirmation page
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:#0d9488;">✅ User approved successfully!</h2>
        <p>The user has been notified by email.</p>
        <a href="https://hostkeepdigital.co.uk/admin" style="color:#0d9488;">Go to Admin Panel</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("approveUsers error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});