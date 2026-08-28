import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Lightning, Receipt, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { formatLimit, planLabel } from "@/lib/plans";
import { plans } from "@/lib/site";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { UpgradeButtons } from "@/components/dashboard/upgrade-buttons";
import { Callout } from "@/components/ui/callout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Subscription · Settings" };
type InvoiceRow = { id: string; date: string; amount: string; status: string; url: string | null };

async function recentInvoices(customerId: string | null): Promise<InvoiceRow[]> {
  if (!customerId || !isStripeConfigured()) return [];
  const stripe = getStripe();
  if (!stripe) return [];
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 5 });
    return invoices.data.map((invoice) => ({ id: invoice.id ?? "", date: invoice.created ? new Date(invoice.created * 1000).toLocaleDateString() : "—", amount: ((invoice.amount_paid ?? invoice.total ?? 0) / 100).toLocaleString(undefined, { style: "currency", currency: (invoice.currency ?? "usd").toUpperCase() }), status: invoice.status ?? "unknown", url: invoice.hosted_invoice_url ?? null }));
  } catch (error) { console.error("[settings/subscription] failed to load invoices", error); return []; }
}

const invoiceTone: Record<string, "success" | "warning" | "danger" | "neutral"> = { paid: "success", open: "warning", uncollectible: "danger", void: "neutral", draft: "neutral" };

export default async function SubscriptionPage() {
  const user = await requireUser();
  const [usage, invoices] = await Promise.all([getUserUsage(user.id, user.planId), recentInvoices(user.stripeCustomerId)]);
  const stripeReady = isStripeConfigured();

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft size={14} weight="bold" /> Account settings</Link>
      <header className="relative overflow-hidden rounded-2xl border border-border bg-foreground px-6 py-8 text-background sm:px-9 sm:py-10"><div className="absolute -right-16 -top-20 size-64 rounded-full border border-background/10" /><div className="relative grid gap-7 lg:grid-cols-[1fr_360px] lg:items-end"><div><div className="flex items-center gap-2 text-primary"><CreditCard size={18} weight="duotone" /><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">Settings / Subscription</p></div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Your catalog, on your terms.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-background/55">Manage plan capacity, billing, and the features that support your release strategy.</p></div><div className="rounded-xl border border-background/15 bg-background/10 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wider text-background/45">Current plan</p><p className="mt-2 text-3xl font-semibold">{planLabel(user.planId)}</p></div><Badge tone={user.stripeStatus === "active" ? "success" : "neutral"} className="capitalize">{user.stripeStatus}</Badge></div><div className="mt-5 h-px bg-background/10" /><p className="mt-4 flex items-center gap-2 text-xs text-background/55"><ShieldCheck size={15} className="text-primary" weight="duotone" /> Access changes only after verified Stripe webhooks.</p></div></div></header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Lightning size={19} weight="duotone" /></div><div><h2 className="font-semibold">Plan capacity</h2><p className="mt-0.5 text-xs text-muted-foreground">Your usage in the current billing window</p></div></div><div className="mt-7 space-y-6"><UsageMeter label="Artists" used={usage.artistsUsed} limit={usage.artistsLimit} /><UsageMeter label="Submitted releases this month" used={usage.releasesThisMonth} limit={usage.releasesLimit} /></div></div>
        <div className="rounded-2xl border border-border bg-card p-6"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Billing history</p>{invoices.length === 0 ? <div className="py-9 text-center"><Receipt size={24} className="mx-auto text-muted-foreground" weight="duotone" /><p className="mt-3 text-sm font-medium">No payments yet</p><p className="mt-1 text-xs text-muted-foreground">Invoices will appear here.</p></div> : <ul className="mt-4 divide-y divide-border">{invoices.map((invoice) => <li key={invoice.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{invoice.amount}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{invoice.date}</p></div><div className="flex items-center gap-2"><Badge tone={invoiceTone[invoice.status] ?? "neutral"} className="capitalize">{invoice.status}</Badge>{invoice.url ? <a href={invoice.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">View</a> : null}</div></li>)}</ul>}</div>
      </section>

      <section><div className="mb-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Available plans</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Choose the room your catalog needs.</h2></div><div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-3">{plans.map((plan, index) => <article key={plan.id} className={cn("relative p-6 sm:p-7", index > 0 && "border-t border-border lg:border-l lg:border-t-0", plan.id === user.planId && "bg-primary/[0.045]")}><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{plan.name}</h3>{plan.id === user.planId ? <Badge tone="success">Current</Badge> : null}</div><p className="mt-5 text-3xl font-semibold tracking-tight">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p><ul className="mt-6 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground"><Check size={15} className="mt-0.5 shrink-0 text-primary" weight="bold" />{feature}</li>)}</ul></article>)}</div></section>
      <UpgradeButtons currentPlan={user.planId} stripeReady={stripeReady} hasCustomer={Boolean(user.stripeCustomerId)} />
      {!stripeReady ? <Callout tone="warning">Stripe billing is not configured. Add the Stripe secret and price IDs to the deployment environment. Your local plan limits—including {formatLimit(usage.artistsLimit)} artist slots—still apply.</Callout> : null}
    </div>
  );
}
