import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Analytics · Admin" };

export default async function AdminAnalyticsPage() {
  await requirePermission("analytics.read");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    submittedToday,
    submittedMonth,
    approvedInternal,
    changesRequired,
    rejected,
    qcWarnings,
    docsRequested,
    users,
    free,
    starter,
    pro,
    openSupport,
  ] = await Promise.all([
    prisma.release.count({ where: { submittedAt: { gte: startOfDay } } }),
    prisma.release.count({ where: { submittedAt: { gte: startOfMonth } } }),
    prisma.releaseActivity.count({
      where: { type: "internal_approved" },
    }),
    prisma.release.count({
      where: {
        status: {
          in: [
            "internal_changes_required",
            "labelgrid_changes_required",
            "changes_required",
          ],
        },
      },
    }),
    prisma.release.count({
      where: {
        status: {
          in: ["internal_rejected", "labelgrid_rejected", "rejected"],
        },
      },
    }),
    prisma.release.count({
      where: { qcStatus: { in: ["warning", "review_required"] } },
    }),
    prisma.releaseActivity.count({ where: { type: "document_requested" } }),
    prisma.user.count(),
    prisma.user.count({ where: { planId: "free" } }),
    prisma.user.count({ where: { planId: "starter" } }),
    prisma.user.count({ where: { planId: "pro" } }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] } },
    }),
  ]);

  const paid = starter + pro;
  const conversion =
    users > 0 ? Math.round((paid / users) * 1000) / 10 : 0;

  const rows = [
    ["Submitted today", submittedToday],
    ["Submitted this month", submittedMonth],
    ["Internal approvals (all time)", approvedInternal],
    ["Currently changes required", changesRequired],
    ["Rejected (final)", rejected],
    ["QC warning / review required", qcWarnings],
    ["Documents requested (all time)", docsRequested],
    ["Users", users],
    ["Free", free],
    ["Starter", starter],
    ["Pro", pro],
    ["Free → paid %", `${conversion}%`],
    ["Support backlog", openSupport],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational metrics from local data only — no fabricated charts.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-border bg-card p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
