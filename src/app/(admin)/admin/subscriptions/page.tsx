import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { planLabel } from "@/lib/plans";
import Link from "next/link";

export const metadata = { title: "Subscriptions · Admin" };

export default async function AdminSubscriptionsPage() {
  await requirePermission("subscriptions.manage");

  const [byPlan, pastDue, canceled, recent] = await Promise.all([
    prisma.user.groupBy({
      by: ["planId"],
      _count: true,
    }),
    prisma.user.count({ where: { stripeStatus: "past_due" } }),
    prisma.user.count({ where: { stripeStatus: "canceled" } }),
    prisma.user.findMany({
      where: { planId: { in: ["starter", "pro"] } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        name: true,
        email: true,
        planId: true,
        stripeStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Local plan state mirrored from Stripe. Manual Stripe mutations are not
          performed here — open Stripe for billing changes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(["free", "starter", "pro"] as const).map((plan) => (
          <div
            key={plan}
            className="rounded-md border border-border bg-card p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {planLabel(plan)}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {byPlan.find((p) => p.planId === plan)?._count ?? 0}
            </p>
          </div>
        ))}
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Past due
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{pastDue}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Canceled
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{canceled}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Stripe status</th>
              <th className="px-3 py-2">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recent.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-medium hover:underline"
                  >
                    {u.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-3 py-2.5">{planLabel(u.planId)}</td>
                <td className="px-3 py-2.5 text-xs">{u.stripeStatus}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                  {u.stripeCustomerId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
