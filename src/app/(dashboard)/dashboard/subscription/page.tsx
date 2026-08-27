import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { formatLimit, planLabel } from "@/lib/plans";
import { plans } from "@/lib/site";
import { isStripeConfigured } from "@/lib/stripe";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { UpgradeButtons } from "@/components/dashboard/upgrade-buttons";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/lib/utils";

export const metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const user = await requireUser();
  const usage = await getUserUsage(user.id, user.planId);
  const stripeReady = isStripeConfigured();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Billing</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Subscription
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Stripe manages your plan. Access updates only after verified webhooks —
          a Checkout redirect alone does not unlock paid features.
        </p>
      </div>

      <section className="border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {planLabel(user.planId)}
        </p>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          Status: {user.stripeStatus}
        </p>
        <div className="mt-6 space-y-4">
          <UsageMeter
            label="Artists"
            used={usage.artistsUsed}
            limit={usage.artistsLimit}
          />
          <UsageMeter
            label="Submitted releases this month"
            used={usage.releasesThisMonth}
            limit={usage.releasesLimit}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "border bg-card p-5",
              plan.id === user.planId ? "border-primary/50" : "border-border"
            )}
          >
            <p className="font-bold">{plan.name}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              {plan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {plan.period}
              </span>
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {plan.id === user.planId ? (
              <p className="mt-5 text-sm font-semibold text-primary">
                Current plan
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <UpgradeButtons
        currentPlan={user.planId}
        stripeReady={stripeReady}
        hasCustomer={Boolean(user.stripeCustomerId)}
      />

      {!stripeReady ? (
        <Callout tone="warning">
          Stripe test keys are not set. Add{" "}
          <code className="rounded bg-muted px-1">STRIPE_SECRET_KEY</code> and
          price IDs to <code className="rounded bg-muted px-1">.env</code> (see{" "}
          <code className="rounded bg-muted px-1">.env.example</code>). Artist
          limits of {formatLimit(usage.artistsLimit)} still apply on your local
          plan.
        </Callout>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Need help?{" "}
        <Link
          href="/dashboard/support"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Contact support
        </Link>
      </p>
    </div>
  );
}
