import Link from "next/link";
import {
  ArrowRight,
  Bank,
  Disc,
  FileCsv,
  Pulse,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requirePermission } from "@/lib/auth/admin";
import { getAdminHomeSnapshot } from "@/lib/admin/home";
import { formatDistanceToNow } from "@/lib/admin/format";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { ProviderArtwork } from "@/components/admin/provider-artwork";
import { planLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata = { title: "Platform Health · Admin" };
export const dynamic = "force-dynamic";

const integer = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default async function AdminHomePage() {
  const admin = await requirePermission("admin.access");
  const snap = await getAdminHomeSnapshot();
  const s = snap.summary;
  const allOperational =
    snap.health.rdistroApi === "operational" &&
    snap.health.labelgrid === "operational" &&
    snap.health.webhooks === "operational";

  const coreMetrics = [
    { label: "Total users", value: s.usersTotal, href: "/admin/users", icon: UsersThree },
    { label: "Active artists", value: s.activeArtists, href: "/admin/artists", icon: Pulse },
    { label: "Total releases", value: s.releasesTotal, href: "/admin/releases?filter=all", icon: Disc },
    { label: "Total tracks", value: s.tracksTotal, href: "/admin/releases?filter=all", icon: Pulse },
  ];
  const catalogMetrics = [
    { label: "Draft releases", value: s.draftReleases, href: "/admin/releases?filter=all" },
    { label: "Awaiting RDISTRO review", value: s.pendingReview, href: "/admin/releases?filter=pending_review", alert: s.pendingReview > 0 },
    { label: "Changes required", value: s.changesRequired, href: "/admin/releases?filter=changes_required", alert: s.changesRequired > 0 },
    { label: "Approved releases", value: s.approvedReleases, href: "/admin/releases?filter=approved" },
    { label: "Delivering / live", value: s.deliveringLive, href: "/admin/releases?filter=delivering" },
    { label: "Takedown requests", value: s.takedownRequests, href: "/admin/takedowns", alert: s.takedownRequests > 0 },
    { label: "Open support tickets", value: s.openSupport, href: "/admin/support?status=open", alert: s.openSupport > 0 },
    { label: "Pending withdrawals", value: s.pendingWithdrawals, href: "/admin/royalties", alert: s.pendingWithdrawals > 0 },
  ];
  const actionItems = [
    { label: "Releases waiting for review", value: s.pendingReview, href: "/admin/releases?filter=pending_review" },
    { label: "Changes required", value: s.changesRequired, href: "/admin/releases?filter=changes_required" },
    { label: "QC flagged releases", value: s.qcFlagged, href: "/admin/releases?filter=qc_flagged" },
    { label: "Pending rights documents", value: s.docsPending, href: "/admin/action-required#documentation" },
    { label: "LabelGrid sync failures", value: s.syncFailures, href: "/admin/releases?filter=sync_issues" },
    { label: "Open support tickets", value: s.openSupport, href: "/admin/support?status=open" },
    { label: "Takedown requests", value: s.takedownRequests, href: "/admin/takedowns" },
    { label: "Pending withdrawals", value: s.pendingWithdrawals, href: "/admin/royalties" },
  ];

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-10">
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <HealthDot state={allOperational ? "operational" : "degraded"} />
            {allOperational ? "Platform operational" : "Platform needs attention"}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Platform health
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Catalog, review, support, delivery, and financial operations in one live view.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Signed in as {admin.name}</p>
      </header>

      <nav aria-label="Quick actions" className="grid border border-border bg-card md:grid-cols-3">
        <QuickLink href="/admin/review-queue" label="Review releases" detail={`${s.pendingReview} waiting`} icon={<Disc />} />
        <QuickLink href="/admin/royalties" label="Import royalties" detail="Open royalty ledger" icon={<FileCsv />} />
        <QuickLink href="/admin/royalties" label="Process withdrawals" detail={`${s.pendingWithdrawals} pending`} icon={<Bank />} />
      </nav>

      <section aria-labelledby="platform-scale-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="platform-scale-heading" className="text-sm font-semibold">Platform scale</h2>
          <span className="text-xs text-muted-foreground">Database totals</span>
        </div>
        <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
          {coreMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link key={metric.label} href={metric.href} className="group min-h-36 bg-card p-4 transition-colors hover:bg-muted sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                  <Icon size={17} weight="duotone" className="text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
                </div>
                <strong className="mt-8 block text-4xl font-semibold tracking-[-0.05em] tabular-nums sm:text-5xl">
                  {integer.format(metric.value)}
                </strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="catalog-health-heading" className="border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="catalog-health-heading" className="text-sm font-semibold">Operational load</h2>
          <span className="text-xs text-muted-foreground">Current states</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 xl:grid-cols-8">
          {catalogMetrics.map((metric) => (
            <Link key={metric.label} href={metric.href} className="group min-h-28 bg-card p-4 transition-colors hover:bg-muted">
              <div className="flex items-start justify-between gap-2">
                <span className="max-w-28 text-xs leading-4 text-muted-foreground">{metric.label}</span>
                {metric.alert ? <WarningCircle size={14} weight="fill" className="shrink-0 text-amber-600" aria-hidden /> : null}
              </div>
              <strong className="mt-4 block text-2xl font-semibold tabular-nums">{integer.format(metric.value)}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="pipeline-heading" className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 id="pipeline-heading" className="text-sm font-semibold">Release pipeline</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Submitted is cumulative. All later stages show current release state.</p>
        </div>
        <ol className="grid md:grid-cols-5">
          {snap.pipeline.map((stage, index) => (
            <li key={stage.key} className={cn("relative", index < snap.pipeline.length - 1 && "border-b border-border md:border-r md:border-b-0")}>
              <Link href={stage.href} className="group block min-h-32 p-4 transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                  {index < snap.pipeline.length - 1 ? <ArrowRight size={14} className="hidden text-muted-foreground md:block" aria-hidden /> : null}
                </div>
                <strong className="mt-5 block text-3xl font-semibold tabular-nums">{integer.format(stage.count)}</strong>
                <span className="mt-1 block text-[11px] text-muted-foreground">{stage.note}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section aria-labelledby="action-heading" className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 id="action-heading" className="text-sm font-semibold">Action required</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Queues that may need staff intervention</p>
            </div>
            <Link href="/admin/action-required" className="flex items-center gap-2 text-xs font-semibold hover:underline">Open workspace <WarningCircle size={18} weight="duotone" className="text-amber-600" aria-hidden /></Link>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {actionItems.map((item) => (
              <Link key={item.label} href={item.href} className="group flex min-h-20 items-center justify-between gap-4 bg-card p-4 transition-colors hover:bg-muted">
                <span className="text-sm text-muted-foreground group-hover:text-foreground">{item.label}</span>
                <span className={cn("text-lg font-semibold tabular-nums", item.value > 0 && "text-amber-700 dark:text-amber-400")}>{integer.format(item.value)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="royalty-heading" className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 id="royalty-heading" className="text-sm font-semibold">Royalty position</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">USD values from wallet and royalty ledgers</p>
          </div>
          <div className="border-b border-border p-5">
            <p className="text-xs text-muted-foreground">Available and unpaid</p>
            <strong className="mt-2 block text-4xl font-semibold tracking-[-0.04em] tabular-nums">{usd.format(Number(s.availableRoyalties))}</strong>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Available wallet credits minus pending, processing, and paid withdrawal debits.</p>
          </div>
          {snap.royaltyMonth ? (
            <Link href={`/admin/royalties/${snap.royaltyMonth.id}`} className="group block p-5 transition-colors hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Current month</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{snap.royaltyMonth.period} / {snap.royaltyMonth.status.replaceAll("_", " ")}</p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" aria-hidden />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <FinanceStat label="Source net" value={usd.format(Number(snap.royaltyMonth.sourceNet))} />
                <FinanceStat label="Artist payable" value={usd.format(Number(snap.royaltyMonth.payable))} />
                <FinanceStat label="Transactions" value={integer.format(snap.royaltyMonth.transactions)} />
                <FinanceStat label="Statements" value={integer.format(snap.royaltyMonth.statements)} />
              </dl>
            </Link>
          ) : (
            <div className="p-5">
              <p className="text-sm font-medium">No current-month royalty period</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Import a statement to create this month&apos;s ledger summary.</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-border bg-card">
          <PanelHeader title="Recent signups" href="/admin/users" />
          {snap.recentUsers.length ? (
            <ul className="divide-y divide-border">
              {snap.recentUsers.map((user) => (
                <li key={user.id}>
                  <Link href={`/admin/users/${user.id}`} className="grid gap-2 p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium">{planLabel(user.planId)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{user._count.artists} artists, {user._count.releases} releases / {formatDistanceToNow(user.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyRow text="No user signups yet." />}
        </section>

        <section className="border border-border bg-card">
          <PanelHeader title="Recent releases" href="/admin/releases?filter=all" />
          {snap.recentReleases.length ? (
            <ul className="divide-y divide-border">
              {snap.recentReleases.map((release) => (
                <li key={release.id}>
                  <Link href={`/admin/releases/${release.id}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40">
                    <div className="size-11 shrink-0 overflow-hidden border border-border bg-muted">
                      {release.labelgridId ? <ProviderArtwork releaseId={release.id} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Disc size={17} className="text-muted-foreground" aria-hidden /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{release.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{release.artist?.name ?? "No artist"}, {release._count.tracks} {release._count.tracks === 1 ? "track" : "tracks"}, {release.user.email}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <AdminStatusBadge status={release.status} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(release.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyRow text="No releases yet." />}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="border border-border bg-card">
          <PanelHeader title="Recent admin activity" href="/admin/audit" />
          {snap.recentAdminActivity.length ? (
            <ul className="divide-y divide-border">
              {snap.recentAdminActivity.map((activity) => (
                <li key={activity.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <p className="text-sm font-medium">{activity.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.actor?.name ?? activity.actor?.email ?? "System"}, {activity.action.replaceAll("_", " ")}, {activity.targetType}</p>
                  </div>
                  <time className="text-[11px] text-muted-foreground">{formatDistanceToNow(activity.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : <EmptyRow text="No admin activity recorded yet." />}
        </section>

        <section className="border border-border bg-card">
          <PanelHeader title="Platform services" href="/admin/system" />
          <ul className="divide-y divide-border">
            {[
              ["Admin server", snap.health.rdistroApi],
              ["LabelGrid API", snap.health.labelgrid],
              ["Webhooks", snap.health.webhooks],
            ].map(([label, state]) => (
              <li key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="inline-flex items-center gap-2 text-xs font-medium capitalize"><HealthDot state={state as "operational" | "degraded" | "down" | "unknown"} />{state}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
            <p>Last catalog sync: {snap.health.lastSyncedReleaseAt ? formatDistanceToNow(snap.health.lastSyncedReleaseAt) : "No sync recorded"}</p>
            <p>Last webhook: {snap.health.lastWebhookAt ? formatDistanceToNow(snap.health.lastWebhookAt) : "No webhook recorded"}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-center gap-3 border-b border-border p-4 transition-colors hover:bg-muted/40 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
      <span className="flex size-9 items-center justify-center bg-foreground text-background [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span>
      <ArrowRight size={15} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function FinanceStat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>;
}

function PanelHeader({ title, href }: { title: string; href: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2><Link href={href} className="text-xs font-medium text-primary hover:underline">View all</Link></div>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function HealthDot({
  state,
}: {
  state: "operational" | "degraded" | "down" | "unknown";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-1.5 rounded-full",
        state === "operational" && "bg-emerald-600",
        state === "degraded" && "bg-amber-500",
        state === "down" && "bg-red-600",
        state === "unknown" && "bg-muted-foreground/40"
      )}
    />
  );
}
