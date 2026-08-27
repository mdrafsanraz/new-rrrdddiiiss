import Link from "next/link";
import {
  ArrowRight,
  Broadcast,
  Disc,
  HourglassMedium,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { formatLimit, planLabel } from "@/lib/plans";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ReleasesTrendChart,
  type ReleaseTrendPoint,
} from "@/components/dashboard/releases-trend-chart";
import { cn } from "@/lib/utils";
import { releaseTitleLabel } from "@/lib/releases/display";
import { statusesForUserFacingFilter } from "@/lib/releases/status";

export const metadata = { title: "Dashboard" };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Last 6 months (oldest first), used to bucket the activity trend chart. */
function buildTrendMonths(): { key: string; date: Date }[] {
  const months: { key: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    months.push({ key: monthKey(d), date: d });
  }
  return months;
}

export default async function DashboardHomePage() {
  const user = await requireUser();
  const usage = await getUserUsage(user.id, user.planId);

  const inReviewStatuses = statusesForUserFacingFilter("in_review")!;
  const changesStatuses = statusesForUserFacingFilter("changes_required")!;
  const liveStatuses = statusesForUserFacingFilter("live")!;
  const draftStatuses = statusesForUserFacingFilter("draft")!;

  const trendMonths = buildTrendMonths();
  const trendSince = trendMonths[0].date;

  const [
    recent,
    upcoming,
    draftCount,
    inReviewCount,
    changesCount,
    liveCount,
    recentActivity,
    trendRows,
  ] = await Promise.all([
    prisma.release.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { artist: true },
    }),
    prisma.release.findMany({
      where: {
        userId: user.id,
        releaseDate: { gt: new Date() },
        status: { notIn: ["taken_down", "rejected", "internal_rejected", "labelgrid_rejected"] },
      },
      orderBy: { releaseDate: "asc" },
      take: 3,
      include: { artist: true },
    }),
    prisma.release.count({
      where: { userId: user.id, status: { in: draftStatuses as never[] } },
    }),
    prisma.release.count({
      where: { userId: user.id, status: { in: inReviewStatuses as never[] } },
    }),
    prisma.release.count({
      where: { userId: user.id, status: { in: changesStatuses as never[] } },
    }),
    prisma.release.count({
      where: { userId: user.id, status: { in: liveStatuses as never[] } },
    }),
    prisma.releaseActivity.findMany({
      where: { release: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { release: { select: { id: true, title: true } } },
    }),
    prisma.release.findMany({
      where: {
        userId: user.id,
        OR: [{ createdAt: { gte: trendSince } }, { submittedAt: { gte: trendSince } }],
      },
      select: { createdAt: true, submittedAt: true },
    }),
  ]);

  const createdByMonth = new Map(trendMonths.map((m) => [m.key, 0]));
  const submittedByMonth = new Map(trendMonths.map((m) => [m.key, 0]));
  for (const r of trendRows) {
    const ck = monthKey(r.createdAt);
    if (createdByMonth.has(ck)) createdByMonth.set(ck, (createdByMonth.get(ck) ?? 0) + 1);
    if (r.submittedAt) {
      const sk = monthKey(r.submittedAt);
      if (submittedByMonth.has(sk)) submittedByMonth.set(sk, (submittedByMonth.get(sk) ?? 0) + 1);
    }
  }
  const trendData: ReleaseTrendPoint[] = trendMonths.map((m) => ({
    date: m.date,
    created: createdByMonth.get(m.key) ?? 0,
    submitted: submittedByMonth.get(m.key) ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {planLabel(user.planId)} plan · artist slots{" "}
            {usage.artistsUsed}
            {usage.artistsLimit === null ? "" : `/${usage.artistsLimit}`}
          </p>
        </div>
        <Link
          href="/dashboard/releases/new"
          className={cn(buttonVariants(), "h-10 px-5")}
        >
          Create release
          <ArrowRight className="size-4" weight="bold" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Disc size={18} weight="bold" aria-hidden />}
          label="Releases"
          value={String(usage.totalReleases)}
          href="/dashboard/releases"
          delay={0}
        />
        <Kpi
          icon={<HourglassMedium size={18} weight="bold" aria-hidden />}
          label="In Review"
          value={String(inReviewCount)}
          href="/dashboard/releases?status=in_review"
          delay={60}
        />
        <Kpi
          icon={<WarningCircle size={18} weight="bold" aria-hidden />}
          label="Changes Required"
          value={String(changesCount)}
          href="/dashboard/releases?status=changes_required"
          alert={changesCount > 0}
          delay={120}
        />
        <Kpi
          icon={<Broadcast size={18} weight="bold" aria-hidden />}
          label="Live"
          value={String(liveCount)}
          href="/dashboard/releases?status=live"
          delay={180}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Drafts" value={String(draftCount)} delay={0} />
        <MiniStat label="Artists" value={String(usage.artistsUsed)} delay={60} />
        <MiniStat label="Tracks" value={String(usage.totalTracks)} delay={120} />
      </div>

      <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <div>
            <CardTitle>Catalog activity</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Releases created vs. submitted for review, last 6 months.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <ReleasesTrendChart data={trendData} />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500">
          <h2 className="text-sm font-semibold">Plan usage</h2>
          <div className="mt-4 space-y-4">
            <UsageMeter
              label="Artists"
              used={usage.artistsUsed}
              limit={usage.artistsLimit}
            />
            <UsageMeter
              label="Submitted this month"
              used={usage.releasesThisMonth}
              limit={usage.releasesLimit}
              hint={
                usage.releasesLimit === null
                  ? "Unlimited submissions"
                  : `Free plan counts first submit only (not drafts or resubmits). ${formatLimit(usage.releasesLimit)} / month.`
              }
            />
          </div>
          {!usage.canCreateArtist || !usage.canCreateRelease ? (
            <Link
              href="/dashboard/subscription"
              className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Upgrade plan
            </Link>
          ) : null}
        </Card>

        <Card
          className="p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="text-sm font-semibold">Subscription</h2>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {planLabel(user.planId)}
          </p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            Billing: {user.stripeStatus === "none" ? "none" : user.stripeStatus}
          </p>
          <Link
            href="/dashboard/subscription"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-5 h-9 px-4 text-sm"
            )}
          >
            Manage subscription
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recent releases</h2>
            <Link
              href="/dashboard/releases"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty
              title="No releases yet"
              body="Create a release to start RDISTRO review. Distribution review only begins after we approve."
              href="/dashboard/releases/new"
              cta="Create release"
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/releases/${r.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-200 ease-[var(--ease-rdistro)] hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {releaseTitleLabel(r.title)}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {r.artist?.name ?? "No artist"} · {r.catalogNumber}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Activity will appear as you submit and update releases.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/releases/${a.release.id}`}
                    className="block px-5 py-3.5 transition-colors duration-200 ease-[var(--ease-rdistro)] hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {a.release.title} · {a.createdAt.toLocaleString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {upcoming.length > 0 ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{r.title}</span>
                <span className="text-muted-foreground">
                  {r.releaseDate
                    ? r.releaseDate.toLocaleDateString()
                    : "TBD"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  href,
  alert,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  alert?: boolean;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group flex items-start justify-between gap-3 border border-border bg-card p-5 transition-colors duration-200 ease-[var(--ease-rdistro)] hover:bg-muted/40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500",
        alert && "border-amber-400/60"
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      </div>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border transition-colors",
          alert
            ? "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "border-border bg-muted text-muted-foreground group-hover:text-primary"
        )}
      >
        {icon}
      </span>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  delay = 0,
}: {
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="border border-border bg-card px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-500"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {body}
      </p>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "outline" }), "mt-5 h-9 px-4")}
      >
        {cta}
      </Link>
    </div>
  );
}
