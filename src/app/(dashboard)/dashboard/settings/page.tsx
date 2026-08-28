import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { planLabel } from "@/lib/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { EditAccountForm } from "@/components/dashboard/edit-account-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Settings" };

type InvoiceRow = {
  id: string;
  date: string;
  amount: string;
  status: string;
  url: string | null;
};

async function fetchRecentInvoices(customerId: string | null): Promise<InvoiceRow[]> {
  if (!customerId || !isStripeConfigured()) return [];
  const stripe = getStripe();
  if (!stripe) return [];
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 5 });
    return invoices.data.map((inv) => ({
      id: inv.id ?? "",
      date: inv.created ? new Date(inv.created * 1000).toLocaleDateString() : "—",
      amount: ((inv.amount_paid ?? inv.total ?? 0) / 100).toLocaleString(undefined, {
        style: "currency",
        currency: (inv.currency ?? "usd").toUpperCase(),
      }),
      status: inv.status ?? "unknown",
      url: inv.hosted_invoice_url ?? null,
    }));
  } catch (error) {
    console.error("[settings] failed to load invoices", error);
    return [];
  }
}

const invoiceStatusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  open: "warning",
  uncollectible: "danger",
  void: "neutral",
  draft: "neutral",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const invoices = await fetchRecentInvoices(user.stripeCustomerId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, password, and billing.
        </p>
      </div>

      <section className="border border-border bg-card p-5 text-sm">
        <dl>
          <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 first:pt-0">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5 last:pb-0">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{planLabel(user.planId)}</dd>
          </div>
        </dl>
      </section>

      <SettingsTabs
        profile={
          <EditAccountForm
            account={{
              name: user.name,
              phone: user.phone ?? "",
              addressLine1: user.addressLine1 ?? "",
              addressLine2: user.addressLine2 ?? "",
              city: user.city ?? "",
              region: user.region ?? "",
              postalCode: user.postalCode ?? "",
              country: user.country ?? "",
            }}
          />
        }
        password={<ChangePasswordForm />}
        billing={
          <div className="overflow-hidden border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center bg-primary/10 text-primary">
                  <CreditCard size={19} weight="duotone" />
                </div>
                <div>
                  <h2 className="font-semibold">Plan &amp; billing</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Current plan and recent payments
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/subscription"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Manage plan
              </Link>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
              <p className="text-sm text-muted-foreground">
                {planLabel(user.planId)} · status{" "}
                <span className="capitalize">{user.stripeStatus}</span>
              </p>
            </div>
            <div className="p-5 sm:p-7">
              {!isStripeConfigured() ? (
                <p className="text-sm text-muted-foreground">
                  Billing isn&apos;t configured yet, so there&apos;s no payment history to show.
                </p>
              ) : invoices.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt size={16} weight="regular" />
                  No payments yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{inv.amount}</p>
                        <p className="text-xs text-muted-foreground">{inv.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={invoiceStatusTone[inv.status] ?? "neutral"} className="capitalize">
                          {inv.status}
                        </Badge>
                        {inv.url ? (
                          <a
                            href={inv.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
