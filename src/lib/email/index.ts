import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "RDISTRO <no-reply@rdistro.net>";
}

function supportFromAddress() {
  return process.env.SUPPORT_EMAIL_FROM?.trim() || "RDISTRO Support <support@rdistro.net>";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type SupportEmail = {
  to: string;
  subject: string;
  preheader: string;
  heading: string;
  message: string;
  ticketNumber: string;
  ticketSubject: string;
  actionUrl?: string;
  actionLabel?: string;
  replyTo?: string;
};

async function sendSupportEmail(input: SupportEmail) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipped support email to ${input.to}`);
    return;
  }

  const action = input.actionUrl
    ? `<a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;margin-top:24px;padding:12px 18px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(input.actionLabel ?? "View ticket")}</a>`
    : "";
  try {
    const { error } = await resend.emails.send({
      from: supportFromAddress(),
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="display:none">${escapeHtml(input.preheader)}</div><div style="max-width:620px;margin:0 auto;padding:40px 20px"><div style="margin-bottom:18px;font-size:13px;font-weight:800;letter-spacing:.18em">RDISTRO / SUPPORT</div><div style="border:1px solid #e4e4e7;border-radius:18px;background:#fff;padding:32px"><p style="margin:0 0 10px;color:#71717a;font-family:monospace;font-size:12px;font-weight:700">${escapeHtml(input.ticketNumber)}</p><h1 style="margin:0;font-size:26px;line-height:1.2">${escapeHtml(input.heading)}</h1><p style="margin:8px 0 0;color:#71717a;font-size:14px">${escapeHtml(input.ticketSubject)}</p><div style="margin-top:24px;padding:18px;border-left:3px solid #18181b;background:#fafafa;white-space:pre-wrap;font-size:14px;line-height:1.65">${escapeHtml(input.message)}</div>${action}</div><p style="margin:18px 4px 0;color:#a1a1aa;font-size:12px;line-height:1.5">This is an automated notification from RDISTRO Support.</p></div></body></html>`,
    });
    if (error) console.error(`[email] Resend failed to send support email to ${input.to}:`, error);
  } catch (error) {
    // Ticket operations stay successful even when the email provider is unavailable.
    console.error(`[email] Resend request failed for support email to ${input.to}:`, error);
  }
}

export async function notifySupportTeam(input: Omit<SupportEmail, "to">) {
  return sendSupportEmail({ ...input, to: "support@rdistro.net" });
}

export async function notifySupportUser(input: SupportEmail) {
  return sendSupportEmail(input);
}

/**
 * Sends the password-reset email via Resend. When RESEND_API_KEY is not
 * set (local dev without a key), logs the link instead so the flow is
 * still exercisable end-to-end.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject: "Reset your RDISTRO password",
    html: `
      <p>We received a request to reset your RDISTRO password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
  if (error) {
    console.error(`[email] Resend failed to send password reset to ${to}:`, error);
  }
}
