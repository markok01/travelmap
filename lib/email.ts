/**
 * Lightweight email sender for Family Travel Atlas.
 *
 * Env (Vercel / .env.local):
 * - RESEND_API_KEY — optional; without it, emails are logged to the server console (dev-friendly)
 * - EMAIL_FROM — e.g. "Family Travel Atlas <onboarding@resend.dev>"
 * - BETTER_AUTH_URL — used when building absolute links in templates
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function fromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Family Travel Atlas <onboarding@resend.dev>"
  );
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.info(
      [
        "",
        "════════════════════════════════════════",
        "[email] RESEND_API_KEY missing — console fallback",
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "--- text ---",
        input.text,
        "════════════════════════════════════════",
        "",
      ].join("\n"),
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend failed:", res.status, body);
    throw new Error("Failed to send email.");
  }
}

export function passwordResetEmail(opts: {
  name: string;
  resetUrl: string;
}) {
  const subject = "Reset your Family Travel Atlas password";
  const text = [
    `Hi ${opts.name || "there"},`,
    "",
    "We received a request to reset your Family Travel Atlas password.",
    `Open this link to choose a new password (expires in about 1 hour):`,
    opts.resetUrl,
    "",
    "If you didn’t request this, you can ignore this email — your password won’t change.",
    "",
    "— Family Travel Atlas",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c2a2e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#fffcf7;border-radius:16px;padding:32px;border:1px solid #ddd4c6;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5f6b6e;">Family Travel Atlas</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;">Reset your password</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#5f6b6e;">
            Hi ${escapeHtml(opts.name || "there")}, we received a request to reset your password.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${escapeAttr(opts.resetUrl)}"
               style="display:inline-block;background:#2f6f6a;color:#f7fffe;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">
              Choose new password
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#5f6b6e;">
            This link expires in about an hour. If the button doesn’t work, paste this URL into your browser:
          </p>
          <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#2f6f6a;">${escapeHtml(opts.resetUrl)}</p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#8a9396;">
            If you didn’t request this, ignore this email — your password won’t change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export function passwordChangedEmail(opts: { name: string; resetUrl: string }) {
  const subject = "Your Family Travel Atlas password was changed";
  const text = [
    `Hi ${opts.name || "there"},`,
    "",
    "Your Family Travel Atlas password was just changed.",
    "If this was you, no action is needed.",
    "",
    "If you didn’t change it, reset your password immediately:",
    opts.resetUrl,
    "",
    "— Family Travel Atlas",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c2a2e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#fffcf7;border-radius:16px;padding:32px;border:1px solid #ddd4c6;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5f6b6e;">Family Travel Atlas</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;">Password changed</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#5f6b6e;">
            Hi ${escapeHtml(opts.name || "there")}, your password was just updated.
            If this was you, you’re all set.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${escapeAttr(opts.resetUrl)}"
               style="display:inline-block;background:#2f6f6a;color:#f7fffe;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">
              Reset password if this wasn’t you
            </a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#8a9396;">
            If you made this change, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

export function appOrigin() {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
