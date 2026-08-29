/* eslint-disable @next/next/no-img-element -- artwork is hosted by user-selected and provider-managed sources */
import Link from "next/link";
import {
  ArrowRight,
  Bank,
  CaretRight,
  ChartLineUp,
  Check,
  CheckCircle,
  ClockCountdown,
  Disc,
  IdentificationCard,
  MusicNotesPlus,
  Plus,
  TrendUp,
  UserCircle,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { DashboardReveal } from "@/components/dashboard/dashboard-home-motion";
import { PlatformSparkline } from "@/components/dashboard/platform-sparkline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getReleaseAnalytics } from "@/lib/labelgrid/analytics";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";
import {
  fetchLiveReleaseSummary,
  withTimeout,
  type LiveReleaseSummary,
} from "@/lib/labelgrid/live-release";
import { getConfiguredPlan, planLabel } from "@/lib/plans";
import { releaseTitleLabel } from "@/lib/releases/display";
import { statusesForUserFacingFilter } from "@/lib/releases/status";
import { cn } from "@/lib/utils";
import { getWalletBalances } from "@/lib/wallet";

export const metadata = { title: "Dashboard" };

type UnknownRow = Record<string, unknown>;
type PlatformMetric = {
  key: string;
  label: string;
  value: number;
  values: number[];
};
type DeliveryItem = {
  key: string;
  releaseId: string;
  releaseTitle: string;
  artworkUrl: string | null;
  outlet: string;
  state: string;
  operation: string | null;
  updatedAt: string | null;
};

function rows(value: unknown): UnknownRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is UnknownRow => Boolean(row) && typeof row === "object")
    : [];
}

function text(row: UnknownRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function metric(row: UnknownRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function compact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

async function fetchLiveArtwork(labelgridIds: string[]) {
  if (!isLabelGridLive() || labelgridIds.length === 0) {
    return new Map<string, LiveReleaseSummary>();
  }
  const results = await Promise.allSettled(
    labelgridIds.map((id) =>
      withTimeout(fetchLiveReleaseSummary(Number(id)), 4000)
    )
  );
  const summaries = new Map<string, LiveReleaseSummary>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") summaries.set(labelgridIds[index], result.value);
  });
  return summaries;
}

async function reconcileDashboardStatuses(
  releases: { id: string; labelgridId: string | null }[]
) {
  if (!isLabelGridLive()) return;
  const targets = releases.filter(
    (release): release is { id: string; labelgridId: string } =>
      Boolean(release.labelgridId)
  );
  await Promise.allSettled(
    targets.map((release) =>
      withTimeout(
        reconcileLabelGridReleaseStatus(release.id, { deep: true }),
        4000
      )
    )
  );
}

function parseDeliveryItems(releases: Array<{
  id: string;
  title: string;
  artworkUrl: string | null;
  deliveryJson: string;
}>): DeliveryItem[] {
  const items: DeliveryItem[] = [];
  for (const release of releases) {
    let payload: UnknownRow = {};
    try {
      const parsed = JSON.parse(release.deliveryJson);
      if (parsed && typeof parsed === "object") payload = parsed as UnknownRow;
    } catch {
      payload = {};
    }
    const data = payload.data && typeof payload.data === "object" ? payload.data as UnknownRow : payload;
    for (const [index, outlet] of rows(data.outlets).entries()) {
      const outletName = text(outlet, ["outlet_name", "name", "outlet", "platform"]);
      if (!outletName) continue;
      items.push({
        key: `${release.id}-${outletName}-${index}`,
        releaseId: release.id,
        releaseTitle: releaseTitleLabel(release.title),
        artworkUrl: release.artworkUrl,
        outlet: titleCase(outletName),
        state: text(outlet, ["customer_state", "state", "operation"]) || "processing",
        operation: text(outlet, ["operation"]) || null,
        updatedAt: text(outlet, ["updated_at", "updatedAt"]) || null,
      });
      if (items.length === 5) return items;
    }
  }
  return items;
}

function buildPlatformMetrics(streamRows: UnknownRow[]): PlatformMetric[] {
  const totals = new Map<string, number>();
  const byPlatformDate = new Map<string, Map<string, number>>();
  for (const row of streamRows) {
    const platform = text(row, ["platform", "outlet", "store", "source", "dsp"]);
    if (!platform) continue;
    const key = platform.toUpperCase().replaceAll(" ", "_");
    const value = metric(row, ["streams", "views", "total", "count", "value"]);
    totals.set(key, (totals.get(key) ?? 0) + value);
    const date = text(row, ["date", "report_date", "period"]);
    if (date) {
      const dates = byPlatformDate.get(key) ?? new Map<string, number>();
      dates.set(date, (dates.get(date) ?? 0) + value);
      byPlatformDate.set(key, dates);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: titleCase(key),
      value,
      values: [...(byPlatformDate.get(key)?.entries() ?? [])]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, total]) => total),
    }));
}

export default async function DashboardHomePage() {
  const user = await requireUser();
  const analyticsEnabled = (await getConfiguredPlan(user.planId)).analytics;

  const [initialReleases, artist, balances] = await Promise.all([
    prisma.release.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      include: { artist: true },
    }),
    prisma.artist.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    getWalletBalances(user.id),
  ]);

  const [liveArtworkByLabelgridId] = await Promise.all([
    fetchLiveArtwork(
      initialReleases
        .map((release) => release.labelgridId)
        .filter((id): id is string => Boolean(id))
    ),
    reconcileDashboardStatuses(initialReleases),
  ]);
  const [releases, liveCount] = await Promise.all([
    prisma.release.findMany({
      where: { id: { in: initialReleases.map((release) => release.id) } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { artist: true },
    }),
    prisma.release.count({
      where: {
        userId: user.id,
        status: { in: statusesForUserFacingFilter("live") as never[] },
      },
    }),
  ]);
  const labelgridReleases = releases
    .filter((release) => release.labelgridId)
    .slice(0, 6);
  const knownLabelgridIds = new Set(
    releases
      .map((release) => release.labelgridId)
      .filter((id): id is string => Boolean(id))
  );
  for (const id of liveArtworkByLabelgridId.keys()) {
    if (!knownLabelgridIds.has(id)) liveArtworkByLabelgridId.delete(id);
  }
  const displayRelease = (release: (typeof releases)[number]) => {
    const live = release.labelgridId
      ? liveArtworkByLabelgridId.get(release.labelgridId)
      : undefined;
    return {
      ...release,
      title: live?.title ?? release.title,
      artworkUrl: live?.coverUrl ?? release.artworkUrl,
      artistName: live?.artist ?? release.artist?.name ?? "Artist not assigned",
    };
  };
  const displayReleases = releases.map(displayRelease);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
  let platformMetrics: PlatformMetric[] = [];

  if (analyticsEnabled && isLabelGridLive() && labelgridReleases.length) {
    const results = await Promise.allSettled(
      labelgridReleases.map((release) =>
        getReleaseAnalytics({
          labelgridReleaseId: Number(release.labelgridId),
          startDate: dateOnly(start),
          endDate: dateOnly(end),
        })
      )
    );
    const streamRows = results.flatMap((result) =>
      result.status === "fulfilled" ? rows(result.value.sections.streams) : []
    );
    platformMetrics = buildPlatformMetrics(streamRows);
  }

  const accountComplete = Boolean(user.phone && user.country);
  const artistComplete = Boolean(artist);
  const payoutComplete = Boolean(user.payoutMethod);
  const releaseComplete = releases.length > 0;
  const analyticsComplete = analyticsEnabled;
  const setupItems = [
    {
      title: "Complete your account details",
      description: "Add a phone number and country for account verification.",
      href: "/dashboard/settings",
      complete: accountComplete,
      icon: IdentificationCard,
    },
    {
      title: "Set up your artist profile",
      description: artist ? `${artist.name} is connected to your catalog.` : "Create the artist identity behind your music.",
      href: artist ? `/dashboard/artists/${artist.id}` : "/dashboard/artists",
      complete: artistComplete,
      icon: UserCircle,
    },
    {
      title: "Connect a payout method",
      description: payoutComplete ? `${titleCase(user.payoutMethod!)} is ready for withdrawals.` : "Choose where RDISTRO should send your earnings.",
      href: "/dashboard/wallet",
      complete: payoutComplete,
      icon: Bank,
    },
    {
      title: "Upload your first release",
      description: releaseComplete ? `${releases.length} release${releases.length === 1 ? "" : "s"} in your catalog.` : "Add music, artwork, credits, and distribution stores.",
      href: releaseComplete ? "/dashboard/releases" : "/dashboard/releases/new",
      complete: releaseComplete,
      icon: MusicNotesPlus,
    },
    {
      title: "Unlock audience analytics",
      description: analyticsEnabled ? "Platform reporting is available on your plan." : "Upgrade to see streams, listeners, saves, and territories.",
      href: analyticsEnabled ? "/dashboard/analytics" : "/dashboard/settings/subscription",
      complete: analyticsComplete,
      icon: ChartLineUp,
    },
  ];
  const completedSetup = setupItems.filter((item) => item.complete).length;
  const deliveryItems = parseDeliveryItems(displayReleases);
  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-[1540px] space-y-10 pb-16">
      <DashboardReveal className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm text-muted-foreground">{planLabel(user.planId)} workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Welcome back, {firstName}</h1>
        </div>
        <Link href="/dashboard/releases/new" className={cn(buttonVariants(), "h-11 rounded-full px-5")}>
          <Plus size={16} weight="bold" /> New release
        </Link>
      </DashboardReveal>

      <DashboardReveal delay={0.03} className="grid gap-3 md:grid-cols-3">
        <SnapshotCard
          href="/dashboard/wallet"
          icon={<TrendUp size={19} weight="duotone" />}
          label="Total earnings"
          value={`$${Number(balances.lifetimeEarnings).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          detail="Lifetime published royalties"
        />
        <SnapshotCard
          href="/dashboard/wallet"
          icon={<Wallet size={19} weight="duotone" />}
          label="Available in wallet"
          value={`$${Number(balances.available).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          detail={Number(balances.pending) > 0 ? `$${Number(balances.pending).toFixed(2)} pending` : "Ready for payout when funded"}
        />
        <SnapshotCard
          href="/dashboard/releases?status=live"
          icon={<Disc size={19} weight="duotone" />}
          label="Live catalog"
          value={`${liveCount} release${liveCount === 1 ? "" : "s"}`}
          detail="Available on selected stores"
        />
      </DashboardReveal>

      {completedSetup < setupItems.length ? (
        <DashboardReveal delay={0.04}>
          <section className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_18px_55px_oklch(0.3_0.02_250/0.06)]">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-lg font-semibold">Complete account setup</h2>
                <p className="mt-1 text-sm text-muted-foreground">A few details help you distribute and receive earnings without delays.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#6659ed]">{completedSetup}/{setupItems.length}</span>
                <span
                  className="grid size-10 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#776bff ${(completedSetup / setupItems.length) * 360}deg, color-mix(in oklab, var(--border), transparent 20%) 0)` }}
                >
                  <span className="size-7 rounded-full bg-card" />
                </span>
              </div>
            </div>
            <div>
              {setupItems.map((item, index) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/45 sm:px-7",
                    index !== setupItems.length - 1 && "border-b border-border/60",
                    item.complete && "text-muted-foreground"
                  )}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", item.complete ? "bg-emerald-50 text-emerald-600" : "bg-[#f1efff] text-[#6d60ec]") }>
                    {item.complete ? <Check size={18} weight="bold" /> : <item.icon size={19} weight="duotone" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-semibold sm:text-base", item.complete && "line-through decoration-border")}>{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm">{item.description}</span>
                  </span>
                  <CaretRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </section>
        </DashboardReveal>
      ) : null}

      <DashboardReveal delay={0.08}>
        <SectionHeading title="Analytics" href="/dashboard/analytics" action="View all" />
        {!analyticsEnabled ? (
          <Link href="/dashboard/settings/subscription" className="mt-5 flex min-h-40 items-center justify-between gap-5 rounded-[22px] border border-border bg-[#f5f4ff] p-6 transition-transform hover:-translate-y-0.5 sm:p-7">
            <div><p className="font-semibold">Audience analytics are available on Pro</p><p className="mt-2 max-w-xl text-sm text-muted-foreground">See platform streams, listeners, saves, territories, and track performance.</p></div>
            <ArrowRight size={20} className="shrink-0 text-[#675bea]" />
          </Link>
        ) : platformMetrics.length ? (
          <div className="mt-5 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:none] xl:grid-flow-row xl:grid-cols-4">
            {platformMetrics.map((platform) => (
              <Link key={platform.key} href={`/dashboard/analytics?platform=${platform.key}`} className="flex min-h-52 flex-col rounded-[22px] border border-border/80 bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-[0_16px_35px_oklch(0.3_0.02_250/0.08)]">
                <p className="text-sm font-semibold text-muted-foreground">{platform.label}</p>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{compact(platform.value)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Streams, last 28 days</p>
                <PlatformSparkline values={platform.values} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border border-border bg-card px-6 py-10 text-center">
            <ChartLineUp size={24} className="mx-auto text-muted-foreground" />
            <p className="mt-3 font-semibold">No platform data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Platform cards will appear once we report your first streams.</p>
          </div>
        )}
      </DashboardReveal>

      <DashboardReveal delay={0.12}>
        <SectionHeading title="Releases" href="/dashboard/releases" action="View all" />
        {releases.length ? (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {displayReleases.slice(0, 10).map((release) => (
              <Link key={release.id} href={`/dashboard/releases/${release.id}`} className="group min-w-0">
                <div className="aspect-square overflow-hidden rounded-[18px] bg-muted shadow-[0_10px_28px_oklch(0.3_0.02_250/0.07)]">
                  {release.artworkUrl ? (
                    <img src={release.artworkUrl} alt="" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-rdistro)] group-hover:scale-[1.045]" />
                  ) : (
                    <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_55%)] text-muted-foreground"><Disc size={30} weight="duotone" /></div>
                  )}
                </div>
                <p className="mt-3 truncate text-[15px] font-semibold">{releaseTitleLabel(release.title)}</p>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{release.artistName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={release.status} /><span className="text-xs text-muted-foreground">{release.contentType}</span></div>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/dashboard/releases/new" className="mt-5 grid min-h-64 place-items-center rounded-[22px] border border-dashed border-border bg-card p-8 text-center transition-colors hover:bg-muted/35">
            <span><MusicNotesPlus size={28} className="mx-auto text-[#6d60ec]" /><span className="mt-4 block font-semibold">Create your first release</span><span className="mt-1 block text-sm text-muted-foreground">Artwork, tracks, credits, and distribution in one guided flow.</span></span>
          </Link>
        )}
      </DashboardReveal>

      <DashboardReveal delay={0.16}>
        <SectionHeading title="Delivery log" href="/dashboard/releases" action="Open releases" />
        <section className="mt-5 overflow-hidden rounded-[18px] border border-border/80 bg-card shadow-[0_12px_38px_oklch(0.3_0.02_250/0.045)]">
          {deliveryItems.length ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="grid size-7 place-items-center rounded-lg bg-card text-[#675bea] shadow-sm"><Disc size={14} weight="duotone" /></span>
                  Latest outlet updates
                </div>
                <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">{deliveryItems.length} events</span>
              </div>
              {deliveryItems.map((item, index) => (
                <Link key={item.key} href={`/dashboard/releases/${item.releaseId}`} className={cn("group grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#f7f6ff] sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(8rem,auto)_auto] sm:px-5", index !== deliveryItems.length - 1 && "border-b border-border/60") }>
                  <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm">
                    {item.artworkUrl ? <img src={item.artworkUrl} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-muted-foreground"><Disc size={18} /></div>}
                  </div>
                  <div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{item.outlet}</p><p className="truncate text-sm font-semibold">{item.releaseTitle}</p></div>
                  <div className="hidden min-w-0 text-right sm:block">
                    {item.operation ? <p className="truncate text-xs font-medium">{titleCase(item.operation)}</p> : null}
                    {item.updatedAt ? <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDeliveryDate(item.updatedAt)}</p> : null}
                  </div>
                  <div className="flex items-center gap-2"><DeliveryBadge state={item.state} /><CaretRight size={14} className="hidden text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" /></div>
                </Link>
              ))}
            </>
          ) : (
            <div className="px-6 py-12 text-center"><Disc size={24} className="mx-auto text-muted-foreground" /><p className="mt-3 font-semibold">No delivery events yet</p><p className="mt-1 text-sm text-muted-foreground">Outlet delivery updates appear after a release is submitted for distribution.</p></div>
          )}
        </section>
      </DashboardReveal>
    </div>
  );
}

function SectionHeading({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.035em]">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-[#6256e5]">{action}<ArrowRight size={14} weight="bold" /></Link>
    </div>
  );
}

function SnapshotCard({
  href,
  icon,
  label,
  value,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 flex-col justify-between rounded-[22px] border border-border/80 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[#776bff]/30 hover:shadow-[0_14px_36px_oklch(0.3_0.02_250/0.07)]"
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="grid size-9 place-items-center rounded-xl bg-muted">{icon}</span>
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-5 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tracking-[-0.025em]">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </Link>
  );
}

function DeliveryBadge({ state }: { state: string }) {
  const normalized = state.toLowerCase();
  const complete = ["complete", "completed", "delivered", "live", "accepted", "success"].some((value) => normalized.includes(value));
  const failed = ["failed", "error", "rejected", "cancelled"].some((value) => normalized.includes(value));
  const Icon = complete ? CheckCircle : failed ? WarningCircle : ClockCountdown;
  return <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : failed ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700")}><Icon size={12} weight="fill" />{titleCase(state)}</span>;
}

function formatDeliveryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
