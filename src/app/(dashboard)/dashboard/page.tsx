/* eslint-disable @next/next/no-img-element -- artwork URLs are provider-hosted and not restricted to configured image domains */
import Link from "next/link";
import { ArrowRight, Broadcast, CalendarBlank, CaretRight, Disc, Lightning, TrendUp, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { DashboardPulse, DashboardReveal } from "@/components/dashboard/dashboard-home-motion";
import { ReleasePipeline } from "@/components/dashboard/release-pipeline";
import { ReleasesTrendChart, type ReleaseTrendPoint } from "@/components/dashboard/releases-trend-chart";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsage } from "@/lib/entitlements/server";
import { formatLimit, planLabel } from "@/lib/plans";
import { releaseTitleLabel } from "@/lib/releases/display";
import { statusesForUserFacingFilter } from "@/lib/releases/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

const RDISTRO_REVIEW_STATUSES = new Set(["pending_internal_review", "submitted", "in_review", "internal_approved"]);
const LABELGRID_REVIEW_STATUSES = new Set(["submitting_to_labelgrid", "syncing", "labelgrid_in_review"]);

function buildTrendMonths(): { key: string; date: Date }[] {
  const months: { key: string; date: Date }[] = [];
  for (let index = 5; index >= 0; index--) {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - index);
    months.push({ key: monthKey(date), date });
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
  const deliveringPipelineStatuses = new Set([...statusesForUserFacingFilter("approved")!, ...statusesForUserFacingFilter("delivering")!]);
  const trendMonths = buildTrendMonths();
  const trendSince = trendMonths[0].date;

  const [recent, upcoming, draftCount, inReviewCount, changesCount, liveCount, recentActivity, trendRows, statusCounts] = await Promise.all([
    prisma.release.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 5, include: { artist: true } }),
    prisma.release.findMany({ where: { userId: user.id, releaseDate: { gt: new Date() }, status: { notIn: ["taken_down", "rejected", "internal_rejected", "labelgrid_rejected"] } }, orderBy: { releaseDate: "asc" }, take: 3, include: { artist: true } }),
    prisma.release.count({ where: { userId: user.id, status: { in: draftStatuses as never[] } } }),
    prisma.release.count({ where: { userId: user.id, status: { in: inReviewStatuses as never[] } } }),
    prisma.release.count({ where: { userId: user.id, status: { in: changesStatuses as never[] } } }),
    prisma.release.count({ where: { userId: user.id, status: { in: liveStatuses as never[] } } }),
    prisma.releaseActivity.findMany({ where: { release: { userId: user.id } }, orderBy: { createdAt: "desc" }, take: 5, include: { release: { select: { id: true, title: true } } } }),
    prisma.release.findMany({ where: { userId: user.id, OR: [{ createdAt: { gte: trendSince } }, { submittedAt: { gte: trendSince } }] }, select: { createdAt: true, submittedAt: true } }),
    prisma.release.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  let rdistroReviewCount = 0;
  let labelgridReviewCount = 0;
  let deliveringCount = 0;
  for (const row of statusCounts) {
    if (RDISTRO_REVIEW_STATUSES.has(row.status)) rdistroReviewCount += row._count._all;
    if (LABELGRID_REVIEW_STATUSES.has(row.status)) labelgridReviewCount += row._count._all;
    if (deliveringPipelineStatuses.has(row.status)) deliveringCount += row._count._all;
  }

  const createdByMonth = new Map(trendMonths.map((month) => [month.key, 0]));
  const submittedByMonth = new Map(trendMonths.map((month) => [month.key, 0]));
  for (const release of trendRows) {
    const createdKey = monthKey(release.createdAt);
    if (createdByMonth.has(createdKey)) createdByMonth.set(createdKey, (createdByMonth.get(createdKey) ?? 0) + 1);
    if (release.submittedAt) {
      const submittedKey = monthKey(release.submittedAt);
      if (submittedByMonth.has(submittedKey)) submittedByMonth.set(submittedKey, (submittedByMonth.get(submittedKey) ?? 0) + 1);
    }
  }
  const trendData: ReleaseTrendPoint[] = trendMonths.map((month) => ({ date: month.date, created: createdByMonth.get(month.key) ?? 0, submitted: submittedByMonth.get(month.key) ?? 0 }));
  const createdThisMonth = trendData.at(-1)?.created ?? 0;
  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
      <DashboardReveal>
        <section className="relative overflow-hidden rounded-[28px] bg-[#161922] px-6 py-7 text-[#f6f7fb] shadow-[0_24px_80px_oklch(0.18_0.02_260/0.18)] sm:px-8 sm:py-9 lg:px-10">
          <div className="pointer-events-none absolute -right-20 -top-36 size-[28rem] rounded-full border-[72px] border-[#6f7cff]/10" aria-hidden="true" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-white/55"><DashboardPulse />Catalog workspace</div>
              <h1 className="mt-5 max-w-[13ch] text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-[3.4rem]">Good to see you, {firstName}.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/58 sm:text-base">Your catalog, delivery progress, and release momentum in one focused view.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/dashboard/releases/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f6f7fb] px-5 text-sm font-semibold text-[#161922] transition-transform duration-300 ease-[var(--ease-rdistro)] hover:-translate-y-0.5 active:translate-y-0">Create release <ArrowRight size={16} weight="bold" /></Link>
                <Link href="/dashboard/analytics" className="inline-flex h-11 items-center rounded-full border border-white/16 bg-white/6 px-5 text-sm font-medium text-white transition-colors hover:bg-white/11">Open analytics</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10">
              <HeroMetric label="Releases" value={usage.totalReleases} />
              <HeroMetric label="Live" value={liveCount} />
              <HeroMetric label="Artists" value={usage.artistsUsed} />
            </div>
          </div>
        </section>
      </DashboardReveal>

      <DashboardReveal delay={0.07} className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.8fr)]">
        <section className="rounded-[24px] border border-border/80 bg-card p-5 shadow-[0_16px_50px_oklch(0.3_0.02_250/0.07)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-xl font-semibold tracking-[-0.025em]">Catalog momentum</h2><p className="mt-1 text-sm text-muted-foreground">Created and submitted releases over six months.</p></div>
            {createdThisMonth > 0 ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0ff] px-3 py-1.5 text-xs font-semibold text-[#4654d6]"><TrendUp size={14} weight="bold" />{createdThisMonth} new this month</span> : null}
          </div>
          <div className="mt-7"><ReleasesTrendChart data={trendData} /></div>
        </section>
        <section className="flex flex-col rounded-[24px] border border-border/80 bg-card p-5 shadow-[0_16px_50px_oklch(0.3_0.02_250/0.07)] sm:p-7">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold tracking-[-0.025em]">Release health</h2><p className="mt-1 text-sm text-muted-foreground">What needs your attention now.</p></div><Lightning size={22} weight="fill" className="text-[#6f7cff]" /></div>
          <div className="mt-7 grid flex-1 gap-3">
            <HealthRow href="/dashboard/releases?status=in_review" label="In review" value={inReviewCount} icon={<Broadcast size={18} />} />
            <HealthRow href="/dashboard/releases?status=changes_required" label="Needs changes" value={changesCount} alert icon={<WarningCircle size={18} />} />
            <HealthRow href="/dashboard/releases?status=draft" label="Drafts in progress" value={draftCount} icon={<Disc size={18} />} />
          </div>
        </section>
      </DashboardReveal>

      <DashboardReveal delay={0.12}><ReleasePipeline draft={draftCount} rdistroReview={rdistroReviewCount} labelgridReview={labelgridReviewCount} delivering={deliveringCount} live={liveCount} /></DashboardReveal>

      <DashboardReveal delay={0.16} className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
        <section className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_16px_50px_oklch(0.3_0.02_250/0.07)]">
          <div className="flex items-center justify-between px-5 py-5 sm:px-7"><div><h2 className="text-xl font-semibold tracking-[-0.025em]">Recent releases</h2><p className="mt-1 text-sm text-muted-foreground">The latest movement across your catalog.</p></div><Link href="/dashboard/releases" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5260df] hover:underline">View all <CaretRight size={14} weight="bold" /></Link></div>
          {recent.length === 0 ? <Empty title="Your catalog starts here" body="Create your first release and guide it from draft to every selected store." /> : (
            <div className="grid gap-2 px-3 pb-3 sm:px-5 sm:pb-5">{recent.map((release) => (
              <Link key={release.id} href={`/dashboard/releases/${release.id}`} className="group grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-muted/60 sm:gap-4">
                <div className="size-13 overflow-hidden rounded-xl bg-muted">{release.artworkUrl ? <img src={release.artworkUrl} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-muted-foreground"><Disc size={19} /></div>}</div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{releaseTitleLabel(release.title)}</p><p className="mt-1 truncate text-xs text-muted-foreground">{release.artist?.name ?? "Artist not assigned"} / {release.catalogNumber}</p></div>
                <StatusBadge status={release.status} />
              </Link>
            ))}</div>
          )}
        </section>
        <section className="rounded-[24px] border border-border/80 bg-[#eef0ff] p-5 text-[#20264a] shadow-[0_16px_50px_oklch(0.3_0.02_250/0.07)] sm:p-7">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Activity</h2><p className="mt-1 text-sm text-[#596087]">Recent catalog events and review updates.</p>
          {recentActivity.length === 0 ? <p className="mt-10 text-sm text-[#596087]">Updates will appear after you start working on a release.</p> : <div className="mt-6 space-y-5">{recentActivity.map((activity) => (
            <Link key={activity.id} href={`/dashboard/releases/${activity.release.id}`} className="group grid grid-cols-[auto_1fr] gap-3"><span className="mt-1.5 size-2 rounded-full bg-[#6572ec]" /><span className="min-w-0"><span className="block text-sm font-semibold group-hover:underline">{activity.title}</span><span className="mt-1 block truncate text-xs text-[#6c7398]">{activity.release.title} / {activity.createdAt.toLocaleDateString()}</span></span></Link>
          ))}</div>}
        </section>
      </DashboardReveal>

      <DashboardReveal delay={0.2} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.65fr)]">
        <section className="rounded-[24px] border border-border/80 bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Plan capacity</h2><p className="mt-1 text-sm text-muted-foreground">{planLabel(user.planId)} plan, billing {user.stripeStatus === "none" ? "not active" : user.stripeStatus}.</p></div><Link href="/dashboard/settings/subscription" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-full px-4 text-xs")}>Manage plan</Link></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><UsageMeter label="Artists" used={usage.artistsUsed} limit={usage.artistsLimit} /><UsageMeter label="Submissions this month" used={usage.releasesThisMonth} limit={usage.releasesLimit} hint={usage.releasesLimit === null ? "Unlimited submissions" : `${formatLimit(usage.releasesLimit)} submissions per month.`} /></div>
        </section>
        <section className="rounded-[24px] border border-border/80 bg-card p-5 sm:p-7">
          <div className="flex items-center gap-3"><CalendarBlank size={20} className="text-[#5b68e7]" /><h2 className="text-lg font-semibold">Coming up</h2></div>
          {upcoming.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No scheduled release dates yet.</p> : <div className="mt-5 space-y-4">{upcoming.map((release) => <Link key={release.id} href={`/dashboard/releases/${release.id}`} className="flex items-center justify-between gap-4 text-sm"><span className="truncate font-semibold">{release.title}</span><span className="shrink-0 text-xs text-muted-foreground">{release.releaseDate?.toLocaleDateString()}</span></Link>)}</div>}
        </section>
      </DashboardReveal>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return <div className="bg-white/[0.055] px-3 py-5 text-center backdrop-blur-sm sm:px-5"><p className="text-2xl font-semibold tracking-tight sm:text-3xl"><AnimatedNumber value={value} /></p><p className="mt-1 text-[11px] text-white/48 sm:text-xs">{label}</p></div>;
}

function HealthRow({ href, label, value, icon, alert = false }: { href: string; label: string; value: number; icon: React.ReactNode; alert?: boolean }) {
  return <Link href={href} className={cn("group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all hover:-translate-y-0.5", alert && value > 0 ? "border-amber-200 bg-amber-50 text-amber-950" : "border-border/70 bg-background/55")}><span className={cn("grid size-9 place-items-center rounded-xl", alert && value > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{icon}</span><span className="flex-1 text-sm font-medium">{label}</span><span className="text-xl font-semibold tabular-nums"><AnimatedNumber value={value} /></span><CaretRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="px-6 py-12 text-center"><Disc size={26} className="mx-auto text-muted-foreground" /><p className="mt-4 font-semibold">{title}</p><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p><Link href="/dashboard/releases/new" className={cn(buttonVariants(), "mt-5 rounded-full px-5")}>Create release</Link></div>;
}
