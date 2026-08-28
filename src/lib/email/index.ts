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
