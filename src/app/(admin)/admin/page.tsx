import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { getAdminHomeSnapshot } from "@/lib/admin/home";
import {
  HealthDot,
  PlatformSummaryCards,
} from "@/components/admin/home-widgets";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDistanceToNow } from "@/lib/admin/format";
import { prisma } from "@/lib/db";

export const metadata = { title: "Operations · Admin" };

export default async function AdminHomePage() {
  const admin = await requirePermission("admin.access");
  const snap = await getAdminHomeSnapshot();
  const s = snap.summary;

  const allOperational =
    snap.health.labelgrid === "operational" &&
    snap.health.rdistroApi === "operational";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            RDISTRO Operations
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <HealthDot
              state={allOperational ? "operational" : snap.health.labelgrid}
            />
            {allOperational
              ? "All systems operational"
              : snap.health.labelgrid === "unknown"
                ? "Platform health partially unknown"
                : "Attention needed on platform health"}
            <span className="text-border">·</span>
            Sandbox
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Signed in as {admin.name}
        </p>
      </header>

      <PlatformSummaryCards
        items={[
          {
            key: "users",
            label: "Users",
            value: s.usersTotal,
            hint: `+${s.usersToday} today`,
            href: "/admin/users",
          },
          {
            key: "releases",
            label: "Releases",
            value: s.releasesTotal,
            hint: `${s.submittedToday} submitted today`,
            href: "/admin/releases?filter=all",
          },
          {
            key: "review",
            label: "In review",
            value: s.pendingReview,
            hint: "Waiting for RDISTRO",
            href: "/admin/releases?filter=pending_review",
          },
          {
            key: "qc",
            label: "QC flags",
            value: s.qcFlagged,
            hint: "Warnings / review required",
            href: "/admin/releases?filter=qc_flagged",
          },
          {
            key: "live",
            label: "Live",
            value: s.liveCount,
            hint: "Distributed catalog",
            href: "/admin/releases?filter=live",
          },
          {
            key: "support",
            label: "Support",
            value: s.openSupport,
            hint: "Open tickets",
            href: "/admin/support",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Needs attention</h2>
          </div>
          <ul className="divide-y divide-border">
            {(
              [
                {
                  n: s.pendingReview,
                  label: "Releases waiting for review",
                  href: "/admin/releases?filter=pending_review",
                },
                {
                  n: s.qcFlagged,
                  label: "QC flagged releases",
                  href: "/admin/releases?filter=qc_flagged",
                },
                {
                  n: s.docsPending,
                  label: "Rights documents waiting",
                  href: "/admin/documents?status=pending",
                },
                {
                  n: s.changesRequired,
                  label: "Changes required",
                  href: "/admin/releases?filter=changes_required",
                },
                {
                  n: s.syncFailures,
                  label: "LabelGrid sync failures",
                  href: "/admin/releases?filter=sync_issues",
                },
                {
                  n: s.openSupport,
                  label: "Open support tickets",
                  href: "/admin/support?status=open",
                },
              ] as const
            ).map((row) => (
              <li key={row.href}>
                <Link
                  href={row.href}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums">{row.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Release pipeline</h2>
          </div>
          <ol className="space-y-0 px-4 py-3">
            {snap.pipeline.map((stage, i) => (
              <li key={stage.key} className="relative flex gap-3 pb-4 last:pb-0">
                {i < snap.pipeline.length - 1 ? (
                  <span
                    className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-border"
                    aria-hidden
                  />
                ) : null}
                <span className="relative mt-1.5 size-2 shrink-0 rounded-full bg-foreground/70" />
                <Link
                  href={stage.href}
                  className="flex min-w-0 flex-1 items-baseline justify-between gap-3 hover:underline"
                >
                  <span className="text-sm">{stage.label}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {snap.activities.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {snap.activities.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/admin/releases/${a.releaseId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {a.title}
                    </Link>
                    <time className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(a.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.release.title}
                    {a.description ? ` — ${a.description.slice(0, 80)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Platform health</h2>
            </div>
            <ul className="divide-y divide-border text-sm">
              {(
                [
                  ["RDISTRO API", snap.health.rdistroApi],
                  ["LabelGrid API", snap.health.labelgrid],
                  ["LabelGrid Sandbox", snap.health.labelgridSandbox],
                  ["Webhooks", snap.health.webhooks],
                  ["Stripe", snap.health.stripe],
                  ["Background jobs", snap.health.backgroundJobs],
                ] as const
              ).map(([label, state]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium capitalize">
                    <HealthDot state={state} />
                    {state}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              Last LabelGrid sync:{" "}
              {snap.health.lastSyncedReleaseAt
                ? formatDistanceToNow(snap.health.lastSyncedReleaseAt)
                : "Unknown"}
              {snap.health.lastWebhookAt
                ? ` · Last webhook ${formatDistanceToNow(snap.health.lastWebhookAt)}`
                : " · No webhooks recorded"}
            </div>
          </section>

          {hasPermission(admin.role, "system.read") ? (
            <section className="rounded-md border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">
                  LabelGrid capacity
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Starter plan ceilings — local estimates until provider reports
                  usage.
                </p>
              </div>
              <ul className="space-y-3 px-4 py-3 text-sm">
                <CapacityRow
                  label="Active tracks"
                  value={await trackCountEstimate()}
                  max={3000}
                  source="local"
                />
                <CapacityRow
                  label="Registered labels"
                  value={1}
                  max={5}
                  source="local"
                />
                <CapacityRow
                  label="Royalties processed (mo)"
                  value={0}
                  max={35000}
                  prefix="$"
                  source="unknown"
                />
              </ul>
              <div className="border-t border-border px-4 py-2.5">
                <Link
                  href="/admin/system"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Open system console
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function trackCountEstimate() {
  return prisma.release.findMany({
    where: {
      status: {
        notIn: ["draft", "incomplete", "internal_rejected", "labelgrid_rejected"],
      },
    },
    select: { _count: { select: { tracks: true } } },
  }).then((rows) => rows.reduce((n, r) => n + r._count.tracks, 0));
}

function CapacityRow({
  label,
  value,
  max,
  prefix,
  source,
}: {
  label: string;
  value: number;
  max: number;
  prefix?: string;
  source: "local" | "provider" | "unknown";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {prefix}
          {value.toLocaleString()} / {prefix}
          {max.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {source === "provider"
          ? "Provider reported"
          : source === "local"
            ? "Locally calculated"
            : "Unknown — no data yet"}
      </p>
    </li>
  );
}
