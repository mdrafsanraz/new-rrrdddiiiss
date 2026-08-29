import Link from "next/link";
import { ArrowUpRight, Broadcast, ChartLineUp, Disc, Headphones, MapPin, MusicNotes, Users } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/plans";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { ANALYTICS_PLATFORMS, getReleaseAnalytics, type AnalyticsPlatform } from "@/lib/labelgrid/analytics";
import { AnalyticsPerformanceChart, type AnalyticsPoint } from "@/components/dashboard/analytics-performance-chart";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };
type Search = Promise<Record<string, string | string[] | undefined>>;
type UnknownRow = Record<string, unknown>;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function rows(value: unknown): UnknownRow[] { return Array.isArray(value) ? value.filter((row): row is UnknownRow => Boolean(row) && typeof row === "object") : []; }
function metric(row: UnknownRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}
function text(row: UnknownRow, keys: string[]) {
  for (const key of keys) { const value = row[key]; if (typeof value === "string" && value.trim()) return value.trim(); }
  return "";
}
function total(section: unknown, keys: string[]) { return rows(section).reduce((sum, row) => sum + metric(row, keys), 0); }
function buildTrend(streamRows: UnknownRow[], listenerRows: UnknownRow[]): AnalyticsPoint[] {
  const byDate = new Map<string, { streams: number; listeners: number }>();
  for (const row of streamRows) {
    const date = text(row, ["date", "report_date", "period"]); if (!date) continue;
    const point = byDate.get(date) ?? { streams: 0, listeners: 0 };
    point.streams += metric(row, ["streams", "total", "count", "value"]); byDate.set(date, point);
  }
  for (const row of listenerRows) {
    const date = text(row, ["date", "report_date", "period"]); if (!date) continue;
    const point = byDate.get(date) ?? { streams: 0, listeners: 0 };
    point.listeners += metric(row, ["listeners", "total", "count", "value"]); byDate.set(date, point);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, point]) => ({ date: new Date(`${date}T00:00:00Z`), ...point }));
}
function compact(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function platformLabel(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
type ReleaseAnalytics = Awaited<ReturnType<typeof getReleaseAnalytics>>;
function mergeAnalytics(results: ReleaseAnalytics[]): ReleaseAnalytics {
  const sections: Record<string, unknown[]> = {};
  const leaders: unknown[] = [];
  const placements: unknown[] = [];
  for (const result of results) {
    for (const [key, value] of Object.entries(result.sections)) {
      sections[key] = [...(sections[key] ?? []), ...rows(value)];
    }
    leaders.push(...result.leaders);
    placements.push(...result.placements);
  }
  return { sections, leaders, placements, meta: {}, availability: {} };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const query = await searchParams;
  const releases = await prisma.release.findMany({
    where: { userId: user.id, labelgridId: { not: null } }, orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, labelgridId: true },
  });

  if (!getPlanLimits(user.planId).analytics) {
    return <div className="mx-auto max-w-4xl py-8"><div className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 sm:p-10"><div className="absolute right-0 top-0 size-72 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_68%)]" /><ChartLineUp className="relative size-9 text-primary" weight="duotone" /><h1 className="relative mt-6 text-3xl font-semibold tracking-[-0.04em]">Know what is moving.</h1><p className="relative mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Daily streams, listeners, saves, countries, placements, and track performance are available on Starter and Pro.</p><Link href="/dashboard/settings/subscription" className={cn(buttonVariants(), "relative mt-7 h-10 px-5")}>Unlock analytics <ArrowUpRight size={15} weight="bold" /></Link></div></div>;
  }

  const requestedRelease = first(query.release);
  const allReleases = !requestedRelease || requestedRelease === "all";
  const selected = allReleases ? undefined : releases.find((release) => release.id === requestedRelease);
  const scopedReleases = allReleases ? releases : selected ? [selected] : releases;
  const days = first(query.range) === "365" ? 365 : first(query.range) === "90" ? 90 : 28;
  const requestedPlatform = first(query.platform);
  const platform = ANALYTICS_PLATFORMS.includes(requestedPlatform as AnalyticsPlatform) ? requestedPlatform as AnalyticsPlatform : undefined;
  const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - (days - 1));
  const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
  let analytics: ReleaseAnalytics | null = null;
  let loadError: string | null = null;
  if (scopedReleases.length && isLabelGridLive()) {
    const results = await Promise.allSettled(scopedReleases.map((release) => getReleaseAnalytics({ labelgridReleaseId: Number(release.labelgridId), startDate: dateOnly(start), endDate: dateOnly(end), platform })));
    const successful = results.filter((result): result is PromiseFulfilledResult<ReleaseAnalytics> => result.status === "fulfilled").map((result) => result.value);
    if (successful.length) analytics = mergeAnalytics(successful);
    if (!successful.length) {
      console.error("[dashboard/analytics] all LabelGrid requests failed", results);
      loadError = "Analytics data is temporarily unavailable. Please try again shortly.";
    }
  }

  const sections = analytics?.sections ?? {};
  const trend = buildTrend(rows(sections.streams), rows(sections.listeners));
  const stats = [
    ["Streams", total(sections.streams, ["streams", "total", "count", "value"]), Broadcast],
    ["Listeners", total(sections.listeners, ["listeners", "total", "count", "value"]), Users],
    ["Saves", total(sections.saves, ["saves", "total", "count", "value"]), MusicNotes],
    ["Skips", total(sections.skips, ["skips", "total", "count", "value"]), Headphones],
  ] as const;
  const countryTotals = new Map<string, number>();
  for (const row of rows(sections["streams-by-country"])) {
    const name = text(row, ["country_name", "country", "name", "country_code"]) || "Unknown";
    countryTotals.set(name, (countryTotals.get(name) ?? 0) + metric(row, ["streams", "total", "count", "value"]));
  }
  const countries = [...countryTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const countryMax = Math.max(...countries.map((country) => country.value), 1);
  const leaders = (analytics?.leaders ?? []).map((value) => value as UnknownRow).sort((a, b) => metric(b, ["streams", "total", "count", "value"]) - metric(a, ["streams", "total", "count", "value"])).slice(0, 6);
  const placements = (analytics?.placements ?? []).map((value) => value as UnknownRow).sort((a, b) => metric(b, ["streams", "total", "count", "value"]) - metric(a, ["streams", "total", "count", "value"])).slice(0, 6);

  return <div className="mx-auto max-w-[1200px] space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Audience signal</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Analytics</h1><p className="mt-2 text-sm text-muted-foreground">Performance reported directly by distribution platforms.</p></div><form className="flex flex-wrap gap-2" action="/dashboard/analytics"><select name="release" defaultValue={selected?.id ?? "all"} className="h-10 min-w-48 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"><option value="all">All releases</option>{releases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}</select><select name="platform" defaultValue={platform ?? ""} className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"><option value="">All platforms</option>{ANALYTICS_PLATFORMS.map((item) => <option key={item} value={item}>{platformLabel(item)}</option>)}</select><select name="range" defaultValue={String(days)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select><button className={cn(buttonVariants(), "h-10 px-4")} type="submit">Apply</button></form></div>
    {!scopedReleases.length ? <Card><EmptyState icon={<Disc size={22} />} title="No distributed releases yet" description="Analytics become available after a release is created." /></Card> : !isLabelGridLive() || loadError ? <Card><EmptyState icon={<ChartLineUp size={22} />} title="Analytics unavailable" description={loadError ?? "Analytics is not configured in this environment."} /></Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className="size-4 text-primary" weight="duotone" /></div><p className="mt-6 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{compact(value)}</p><p className="mt-1 text-[11px] text-muted-foreground">Last {days} days</p></Card>)}</div>
      <Card className="p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold">Performance over time</h2><p className="mt-1 text-xs text-muted-foreground">Daily totals across {platform ? platformLabel(platform) : "all reporting platforms"}</p></div><AnalyticsPerformanceChart data={trend} /></Card>
      <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><MapPin className="size-4 text-primary" weight="duotone" /><h2 className="font-semibold">Top countries</h2></div>{countries.length ? <div className="mt-6 space-y-4">{countries.map((country, index) => <div key={`${country.name}-${index}`}><div className="flex justify-between text-sm"><span>{country.name}</span><span className="font-mono text-xs text-muted-foreground">{compact(country.value)}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(country.value / countryMax) * 100}%` }} /></div></div>)}</div> : <EmptyState title="No country data" description="Territory reporting has not arrived for this period." />}</Card>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Top tracks</h2>{leaders.length ? <div className="mt-4 divide-y divide-border">{leaders.map((row, index) => <div key={index} className="flex items-center gap-3 py-3"><span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{text(row, ["track_name", "title", "name"]) || `Track ${index + 1}`}</p><p className="truncate text-xs text-muted-foreground">{text(row, ["artist_name", "artist", "artists"])}</p></div><span className="font-mono text-xs">{compact(metric(row, ["streams", "total", "count", "value"]))}</span></div>)}</div> : <EmptyState title="No track ranking yet" description="Track rankings appear after streams are reported." />}</Card></div>
      <Card className="p-5 sm:p-6"><h2 className="font-semibold">Playlist and radio placements</h2>{placements.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{placements.map((row, index) => <div key={index} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary"><Broadcast size={17} weight="duotone" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{text(row, ["name", "playlist_name", "container_name"]) || "Placement"}</p><p className="text-xs text-muted-foreground">{platformLabel(text(row, ["platform"]) || "platform")} · {compact(metric(row, ["streams", "total", "count", "value"]))} streams</p></div></div>)}</div> : <EmptyState title="No placements reported" description="Playlist and radio features will appear here when platforms report them." />}</Card>
    </>}
  </div>;
}
