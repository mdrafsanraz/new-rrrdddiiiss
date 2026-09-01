import { Resend } from "resend";

const EMAIL_APP_ORIGIN = "https://rdistro.net";

export function emailUrl(path = "") {
  return new URL(path.startsWith("/") ? path : `/${path}`, EMAIL_APP_ORIGIN).toString();
}

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
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="display:none">${escapeHtml(input.preheader)}</div><div style="max-width:620px;margin:0 auto;padding:40px 20px"><div style="margin-bottom:18px;font-size:13px;font-weight:800;letter-spacing:.18em">RDISTRO / SUPPORT</div><div style="border:1px solid #e4e4e7;border-radius:18px;background:#fff;padding:32px"><p style="margin:0 0 10px;color:#71717a;font-family:monospace;font-size:12px;font-weight:700">${escapeHtml(input.ticketNumber)}</p><h1 style="margin:0;font-size:26px;line-height:1.2">${escapeHtml(input.heading)}</h1><p style="margin:8px 0 0;color:#71717a;font-size:14px">${escapeHtml(input.ticketSubject)}</p><div style="margin-top:24px;padding:18px;border-left:3px solid #18181b;background:#fafafa;white-space:pre-wrap;font-size:14px;line-height:1.65">${escapeHtml(input.message)}</div>${action}</div><p style="margin:18px 4px 0;color:#a1a1aa;font-size:12px;line-height:1.5">This is an automated notification from RDISTRO Support. Visit <a href="${emailUrl()}" style="color:#71717a">rdistro.net</a>.</p></div></body></html>`,
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

type ReleaseReviewEmail = {
  to: string;
  releaseTitle: string;
  releaseUrl: string;
  kind: "changes_required" | "document_requested";
  message: string;
  documentKind?: string;
};

/** Notifies the release owner when staff requests changes or a document — the only way they'd otherwise find out is by revisiting the release page. */
export async function notifyReleaseReviewAction(input: ReleaseReviewEmail) {
  const resend = getResend();
  const heading =
    input.kind === "document_requested"
      ? `Document requested${input.documentKind ? `: ${input.documentKind}` : ""}`
      : "Changes requested";
  const subject = `Action needed on "${input.releaseTitle}"`;

  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipped release review email to ${input.to}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject,
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="display:none">${escapeHtml(heading)} for ${escapeHtml(input.releaseTitle)}</div><div style="max-width:620px;margin:0 auto;padding:40px 20px"><div style="margin-bottom:18px;font-size:13px;font-weight:800;letter-spacing:.18em">RDISTRO / RELEASE REVIEW</div><div style="border:1px solid #e4e4e7;border-radius:18px;background:#fff;padding:32px"><h1 style="margin:0;font-size:26px;line-height:1.2">${escapeHtml(heading)}</h1><p style="margin:8px 0 0;color:#71717a;font-size:14px">${escapeHtml(input.releaseTitle)}</p><div style="margin-top:24px;padding:18px;border-left:3px solid #18181b;background:#fafafa;white-space:pre-wrap;font-size:14px;line-height:1.65">${escapeHtml(input.message)}</div><a href="${escapeHtml(input.releaseUrl)}" style="display:inline-block;margin-top:24px;padding:12px 18px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600">View release</a></div><p style="margin:18px 4px 0;color:#a1a1aa;font-size:12px;line-height:1.5">This is an automated notification from RDISTRO. Visit <a href="${emailUrl()}" style="color:#71717a">rdistro.net</a>.</p></div></body></html>`,
    });
    if (error) console.error(`[email] Resend failed to send release review email to ${input.to}:`, error);
  } catch (error) {
    // Review actions stay successful even when the email provider is unavailable.
    console.error(`[email] Resend request failed for release review email to ${input.to}:`, error);
  }
}

export async function notifyReleaseStatusChanged(input: {
  to: string;
  name: string;
  releaseId: string;
  releaseTitle: string;
  statusLabel: string;
  statusDescription: string;
}) {
  return sendBrandedEmail({
    to: input.to,
    subject: `Release update: ${input.releaseTitle} is ${input.statusLabel}`,
    preheader: `The status of ${input.releaseTitle} changed to ${input.statusLabel}.`,
    heading: `Release ${input.statusLabel}`,
    message: `Hi ${input.name}, the status of “${input.releaseTitle}” is now ${input.statusLabel}.\n\n${input.statusDescription}`,
    actionUrl: emailUrl(`/dashboard/releases/${input.releaseId}`),
    actionLabel: "View release",
  });
}

type BrandedEmail = {
  to: string;
  subject: string;
  preheader: string;
  heading: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  replyTo?: string;
};

/** Shared plain-notice template for account-lifecycle emails (welcome, subscription, profile, wallet). */
async function sendBrandedEmail(input: BrandedEmail) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipped email to ${input.to}: ${input.subject}`);
    return;
  }
  const action = input.actionUrl
    ? `<a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;margin-top:24px;padding:12px 18px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(input.actionLabel ?? "Open RDISTRO")}</a>`
    : "";
  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="display:none">${escapeHtml(input.preheader)}</div><div style="max-width:620px;margin:0 auto;padding:40px 20px"><div style="margin-bottom:18px;font-size:13px;font-weight:800;letter-spacing:.18em">RDISTRO</div><div style="border:1px solid #e4e4e7;border-radius:18px;background:#fff;padding:32px"><h1 style="margin:0;font-size:26px;line-height:1.2">${escapeHtml(input.heading)}</h1><div style="margin-top:16px;white-space:pre-wrap;font-size:14px;line-height:1.65;color:#3f3f46">${escapeHtml(input.message)}</div>${action}</div><p style="margin:18px 4px 0;color:#a1a1aa;font-size:12px;line-height:1.5">This is an automated notification from RDISTRO. Visit <a href="${emailUrl()}" style="color:#71717a">rdistro.net</a>.</p></div></body></html>`,
    });
    if (error) console.error(`[email] Resend failed to send email to ${input.to}:`, error);
  } catch (error) {
    // Account operations stay successful even when the email provider is unavailable.
    console.error(`[email] Resend request failed for email to ${input.to}:`, error);
  }
}

/** Marketing site contact form → forwarded to support, reply-to set to the visitor so staff can just hit reply. */
export async function notifyContactMessage(input: {
  name: string;
  email: string;
  message: string;
}) {
  return sendBrandedEmail({
    to: "support@rdistro.net",
    replyTo: input.email,
    subject: `Contact form: ${input.name}`,
    preheader: `New message from ${input.name} (${input.email})`,
    heading: "New contact message",
    message: `From: ${input.name} <${input.email}>\n\n${input.message}`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendBrandedEmail({
    to,
    subject: "Welcome to RDISTRO",
    preheader: "Your account is ready — start building your catalog.",
    heading: `Welcome, ${name}`,
    message:
      "Your RDISTRO account is set up. Add an artist and create your first release whenever you're ready.",
    actionUrl: emailUrl("/dashboard"),
    actionLabel: "Go to dashboard",
  });
}

export async function notifySubscriptionChanged(input: {
  to: string;
  name: string;
  planLabel: string;
  status: string;
}) {
  return sendBrandedEmail({
    to: input.to,
    subject: `Your plan is now ${input.planLabel}`,
    preheader: `Your RDISTRO subscription changed to ${input.planLabel}.`,
    heading: "Subscription updated",
    message: `Hi ${input.name}, your plan is now ${input.planLabel} (status: ${input.status}).`,
    actionUrl: emailUrl("/dashboard/settings/subscription"),
    actionLabel: "View subscription",
  });
}

export async function notifyProfileUpdated(to: string, name: string) {
  return sendBrandedEmail({
    to,
    subject: "Your RDISTRO profile was updated",
    preheader: "Your account profile details were just changed.",
    heading: "Profile updated",
    message: `Hi ${name}, your account profile details were just updated. If this wasn't you, contact support immediately.`,
    actionUrl: emailUrl("/dashboard/settings"),
    actionLabel: "Review profile",
  });
}

export async function notifyWithdrawalStatusChanged(input: {
  to: string;
  name: string;
  amount: string;
  currency: string;
  status: string;
  reason?: string | null;
  /** Settlement breakdown entered by the admin — only present when status is "paid". */
  settlement?: {
    payoutAmount: string;
    taxWithholding: string;
    fee: string;
    paidAmount: string;
  };
}) {
  let message = `Hi ${input.name}, your withdrawal of ${input.amount} ${input.currency} is now ${input.status}.`;
  if (input.settlement) {
    message +=
      `\n\nPayout amount: ${input.settlement.payoutAmount} ${input.currency}` +
      `\nTax withholding: -${input.settlement.taxWithholding} ${input.currency}` +
      `\nFee: -${input.settlement.fee} ${input.currency}` +
      `\nNet amount paid: ${input.settlement.paidAmount} ${input.currency}`;
  }
  if (input.reason) message += `\n\n${input.reason}`;
  return sendBrandedEmail({
    to: input.to,
    subject: `Withdrawal ${input.status}: ${input.amount} ${input.currency}`,
    preheader: `Your withdrawal request is now ${input.status}.`,
    heading: `Withdrawal ${input.status}`,
    message,
    actionUrl: emailUrl("/dashboard/wallet"),
    actionLabel: "View wallet",
  });
}

export async function notifyWalletAdjustment(input: {
  to: string;
  name: string;
  amount: string;
  currency: string;
  isCredit: boolean;
  reason: string;
}) {
  const verb = input.isCredit ? "credited" : "debited";
  return sendBrandedEmail({
    to: input.to,
    subject: `Wallet ${verb}: ${input.amount} ${input.currency}`,
    preheader: `A manual adjustment was made to your wallet.`,
    heading: `Wallet ${verb}`,
    message: `Hi ${input.name}, ${input.amount} ${input.currency} was ${verb} to your wallet.\n\n${input.reason}`,
    actionUrl: emailUrl("/dashboard/wallet"),
    actionLabel: "View wallet",
  });
}

export async function notifyRoyaltyCredited(input: {
  to: string;
  name: string;
  amount: string;
  currency: string;
  periodLabel: string;
}) {
  return sendBrandedEmail({
    to: input.to,
    subject: `New royalty credit: ${input.amount} ${input.currency}`,
    preheader: "A new royalty credit was added to your wallet.",
    heading: "Royalty credited",
    message: `Hi ${input.name}, ${input.amount} ${input.currency} was just added to your wallet for ${input.periodLabel}.`,
    actionUrl: emailUrl("/dashboard/wallet"),
    actionLabel: "View wallet",
  });
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
      <p>Sign in and manage your catalog at <a href="${emailUrl()}">rdistro.net</a>.</p>
    `,
  });
  if (error) {
    console.error(`[email] Resend failed to send password reset to ${to}:`, error);
  }
}
