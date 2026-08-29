import Link from "next/link";
import {
  ArrowRight,
  Disc,
  Eye,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ReleasesFilter } from "@/components/dashboard/releases-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getUserFacingReleaseStatus,
  statusesForUserFacingFilter,
  type ReleaseStatusValue,
} from "@/lib/releases/status";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  fetchLiveReleaseSummary,
  withTimeout,
  type LiveReleaseSummary,
} from "@/lib/labelgrid/live-release";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";

/**
 * Best-effort live overlay for the list view — LabelGrid is the source of
 * truth for title/artwork/artist/track-count, but a slow or unreachable
 * LabelGrid must never break the whole list: any release whose live fetch
 * fails or times out just falls back to its local (last-synced) fields.
 */
async function fetchLiveSummaries(
  labelgridIds: string[]
): Promise<Map<string, LiveReleaseSummary>> {
  if (!isLabelGridLive() || labelgridIds.length === 0) return new Map();
  const results = await Promise.allSettled(
    labelgridIds.map((id) => withTimeout(fetchLiveReleaseSummary(Number(id)), 4000))
  );
  const map = new Map<string, LiveReleaseSummary>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") map.set(labelgridIds[i], r.value);
  });
  return map;
}

/**
 * Same reconciliation the detail page runs on every visit, applied here so
 * status pills on the list are current. This is the single page-visit
 * trigger for user-facing status reconciliation. `deep: true` covers both
 * review and delivery transitions, including Delivering, Live, takedown,
 * and review issues. Best-effort: a slow or failed reconciliation for one
 * release leaves its last persisted status showing.
 */
async function reconcileStatuses(
  releases: { id: string; labelgridId: string | null }[]
): Promise<Map<string, ReleaseStatusValue>> {
  if (!isLabelGridLive()) return new Map();
  const targets = releases.filter(
    (r): r is { id: string; labelgridId: string } => Boolean(r.labelgridId)
  );
  if (targets.length === 0) return new Map();
  const results = await Promise.allSettled(
    targets.map((r) =>
      withTimeout(
        reconcileLabelGridReleaseStatus(r.id, { deep: true }),
        4000
      )
    )
  );
  const map = new Map<string, ReleaseStatusValue>();
  results.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.ok && res.value.status) {
      map.set(targets[i].id, res.value.status);
    }
  });
  return map;
}

export const metadata = { title: "Releases" };

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function ReleasesPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const statusFilter = sp.status?.trim() ?? "";
  const statusIn = statusesForUserFacingFilter(statusFilter);

  const [releases, usage] = await Promise.all([
    prisma.release.findMany({
      where: {
        userId: user.id,
        ...(statusIn ? { status: { in: statusIn as never[] } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { catalogNumber: { contains: q, mode: "insensitive" } },
                { upc: { contains: q, mode: "insensitive" } },
                {
                  artist: {
                    name: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  tracks: {
                    some: {
                      isrc: { contains: q, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { artist: true, _count: { select: { tracks: true } } },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  const [liveByLabelgridId, statusByReleaseId] = await Promise.all([
    fetchLiveSummaries(
      releases
        .map((r) => r.labelgridId)
        .filter((id): id is string => Boolean(id))
    ),
    reconcileStatuses(releases),
  ]);

  const statusCounts = releases.reduce(
    (counts, release) => {
      const status = statusByReleaseId.get(release.id) ?? release.status;
      const key = getUserFacingReleaseStatus(status);
      if (key === "draft") counts.draft += 1;
      if (key === "in_review" || key === "approved" || key === "delivering") {
        counts.inProgress += 1;
      }
      if (key === "live") counts.live += 1;
      return counts;
    },
    { draft: 0, inProgress: 0, live: 0 }
  );

  return (
    <div className="space-y-6 pb-8">
      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Your release catalog
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Build new releases, follow every review, and keep delivery status in view.
          </p>
        </div>
        <Link
          href="/dashboard/releases/new"
          className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}
        >
          <Plus size={16} weight="bold" aria-hidden />
          New release
        </Link>
      </header>

      <section className="grid border border-border bg-card lg:grid-cols-[1.25fr_1fr]">
        <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4 lg:border-r lg:border-b-0">
          <div className="col-span-2 flex min-h-36 flex-col justify-between border-b border-border p-5 sm:col-span-1 sm:border-r sm:border-b-0">
            <span className="text-sm font-medium text-muted-foreground">
              {q || statusFilter ? "Matching releases" : "Total releases"}
            </span>
            <strong className="text-5xl font-semibold tracking-[-0.05em] tabular-nums">
              {releases.length}
            </strong>
          </div>
          {[
            ["Drafts", statusCounts.draft],
            ["In progress", statusCounts.inProgress],
            ["Live", statusCounts.live],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={cn(
                "flex min-h-28 flex-col justify-between p-4 sm:min-h-36 sm:p-5",
                index < 2 && "border-r border-border"
              )}
            >
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
              <strong className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {value}
              </strong>
            </div>
          ))}
        </div>
        <div className="flex items-center p-5 sm:p-6">
          <div className="w-full">
            <UsageMeter
              label="Monthly submissions"
              used={usage.releasesThisMonth}
              limit={usage.releasesLimit}
              hint="Drafts and resubmissions do not use your monthly allowance."
            />
          </div>
        </div>
      </section>

      <ReleasesFilter initialQ={q ?? ""} initialStatus={statusFilter} />

      <section aria-labelledby="release-list-heading" className="border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 id="release-list-heading" className="font-semibold">Catalog</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {releases.length} {releases.length === 1 ? "release" : "releases"} shown
            </p>
          </div>
          {(q || statusFilter) && (
            <Link
              href="/dashboard/releases"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
        {releases.length === 0 ? (
          <EmptyState
            icon={<Disc size={22} weight="regular" aria-hidden />}
            title="No releases match"
            description="Create a release to start the RDISTRO review workflow."
            action={
              <Link
                href="/dashboard/releases/new"
                className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
              >
                Create release
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[4rem_minmax(0,1fr)_7rem_5rem_7.5rem_6rem] items-center gap-4 border-b border-border bg-muted/35 px-5 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid">
              <span aria-hidden />
              <span>Release</span>
              <span>Release date</span>
              <span>Tracks</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            <ul className="divide-y divide-border">
              {releases.map((r) => {
                const live = r.labelgridId
                  ? liveByLabelgridId.get(r.labelgridId)
                  : undefined;
                const status = statusByReleaseId.get(r.id) ?? r.status;
                const title = live?.title ?? r.title;
                const artworkUrl = live?.coverUrl ?? r.artworkUrl;
                const artistName = live?.artist ?? r.artist?.name ?? "No artist";
                const trackCount = live?.trackCount ?? r._count.tracks;
                const dateText = live?.releaseDate
                  ? new Date(live.releaseDate).toLocaleDateString()
                  : r.releaseDate
                    ? r.releaseDate.toLocaleDateString()
                    : null;
                const isDraft = getUserFacingReleaseStatus(status) === "draft";
                const actionHref = isDraft
                  ? `/dashboard/releases/${r.id}/edit`
                  : `/dashboard/releases/${r.id}`;
                return (
                  <li key={r.id} className="group p-4 transition-colors duration-200 ease-[var(--ease-rdistro)] hover:bg-muted/35 sm:p-5 md:grid md:grid-cols-[4rem_minmax(0,1fr)_7rem_5rem_7.5rem_6rem] md:items-center md:gap-4">
                    <div className="flex min-w-0 gap-4 md:contents">
                      <div className="size-16 shrink-0 overflow-hidden border border-border bg-muted md:size-16">
                        {artworkUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artworkUrl}
                            alt=""
                            className="size-full object-cover transition-transform duration-300 ease-[var(--ease-rdistro)] group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Disc size={20} weight="regular" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 md:block">
                        <div className="flex min-w-0 items-start justify-between gap-3 md:block">
                          <Link
                            href={`/dashboard/releases/${r.id}`}
                            className="truncate font-semibold transition-colors group-hover:text-primary hover:underline"
                          >
                            {title}
                          </Link>
                          <span className="shrink-0 md:hidden">
                            <StatusBadge status={status} />
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {artistName}
                          {r.upc ? `, UPC ${r.upc}` : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground md:hidden">
                          {dateText ?? "No release date"}, {trackCount} {trackCount === 1 ? "track" : "tracks"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-3 md:contents">
                      <span className="hidden text-sm text-muted-foreground md:block">
                        {dateText ?? "-"}
                      </span>
                      <span className="hidden text-sm text-muted-foreground tabular-nums md:block">
                        {trackCount}
                      </span>
                      <span className="hidden md:block">
                        <StatusBadge status={status} />
                      </span>
                      <p className="truncate text-xs text-muted-foreground md:hidden">
                        Updated {r.updatedAt.toLocaleDateString()}
                      </p>
                      <Tooltip content={`${isDraft ? "Edit" : "View"} ${title}`}>
                        <Link
                          href={actionHref}
                          aria-label={`${isDraft ? "Edit" : "View"} ${title}`}
                          className={cn(
                            buttonVariants({ variant: isDraft ? "default" : "outline", size: "sm" }),
                            "min-w-20 justify-between px-3"
                          )}
                        >
                          {isDraft ? (
                            <PencilSimple size={14} weight="bold" aria-hidden />
                          ) : (
                            <Eye size={14} weight="bold" aria-hidden />
                          )}
                          {isDraft ? "Edit" : "View"}
                          <ArrowRight size={13} weight="bold" aria-hidden />
                        </Link>
                      </Tooltip>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
