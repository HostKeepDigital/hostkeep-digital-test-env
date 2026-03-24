export function buildEmail({ heading, body, buttonText, buttonUrl }) {
  const buttonBlock = buttonText && buttonUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td align="center">
            <a href="${buttonUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
              ${buttonText}
            </a>
          </td>
        </tr>
      </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HostKeep</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
              <img
                src="https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png"
                alt="HostKeep Digital"
                width="200"
                style="display:block;margin:0 auto;max-width:200px;height:auto;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1>
              <div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>
              ${buttonBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
                <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:bold;">Follow us</p>
              <p style="margin:0;">
                <a href="https://facebook.com/HostKeepDigital" style="text-decoration:none;margin-right:12px;display:inline-block;">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png"
                    alt="Facebook"
                    width="32"
                    height="32"
                    style="display:inline-block;border-radius:6px;" />
                </a>
                <a href="https://instagram.com/hostkeepdigital" style="text-decoration:none;display:inline-block;">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png"
                    alt="Instagram"
                    width="32"
                    height="32"
                    style="display:inline-block;border-radius:6px;" />
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}