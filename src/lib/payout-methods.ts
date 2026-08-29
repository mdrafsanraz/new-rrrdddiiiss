export const PAYOUT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  wise: "Wise",
  payoneer: "Payoneer",
};

export function payoutMethodLabel(method: string | null) {
  if (!method) return "No payout method";
  return PAYOUT_METHOD_LABELS[method] ?? method;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "secure destination";
  return `${name.slice(0, 1)}••••@${domain}`;
}

function maskTail(value: string) {
  const tail = value.slice(-4);
  return tail.length === value.length ? "••••" : `••••${tail}`;
}

type PayoutUser = {
  payoutMethod: string | null;
  payoutEmail: string | null;
  payoutWiseAccount: string | null;
  payoutPayoneerAccount: string | null;
  payoutBankName: string | null;
  payoutBankAccountNumber: string | null;
};

/** Masked one-line summary of where payouts go — safe to render in the UI. */
export function describePayoutDestination(user: PayoutUser): string {
  const label = payoutMethodLabel(user.payoutMethod);
  if (user.payoutMethod === "paypal" && user.payoutEmail) {
    return `${label} · ${maskEmail(user.payoutEmail)}`;
  }
  if (user.payoutMethod === "wise" && user.payoutWiseAccount) {
    const value = EMAIL_RE.test(user.payoutWiseAccount)
      ? maskEmail(user.payoutWiseAccount)
      : maskTail(user.payoutWiseAccount);
    return `${label} · ${value}`;
  }
  if (user.payoutMethod === "payoneer" && user.payoutPayoneerAccount) {
    return `${label} · ${maskEmail(user.payoutPayoneerAccount)}`;
  }
  if (user.payoutMethod === "bank_transfer" && user.payoutBankAccountNumber) {
    const bank = user.payoutBankName ? `${user.payoutBankName} · ` : "";
    return `${label} · ${bank}${maskTail(user.payoutBankAccountNumber)}`;
  }
  return user.payoutMethod ? `${label} · secure destination` : label;
}
