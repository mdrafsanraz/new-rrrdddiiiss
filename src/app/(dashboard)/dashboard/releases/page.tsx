import Link from "next/link";
import { Disc, PencilSimple } from "@phosphor-icons/react/dist/ssr";
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
 * status pills on the list are current too. `deep: false` skips the extra
 * delivery-status fetch per release (that page loads one release at a
 * time; this one loads N) — review-status reconciliation still happens for
 * every release that has passed internal review, which is what drives
 * status transitions. Best-effort: a slow/failed reconcile for one release
 * just leaves its last-synced status showing, same fallback as the live
 * overlay above.
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
        reconcileLabelGridReleaseStatus(r.id, { deep: false }),
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
      orderBy: { updatedAt: "desc" },
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Catalog
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Releases
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track drafts, review, and live deliveries in one place.
          </p>
        </div>
        <Link
          href="/dashboard/releases/new"
          className={cn(buttonVariants(), "h-10 px-5")}
        >
          New release
        </Link>
      </div>

      <section className="border border-border bg-card p-5">
        <UsageMeter
          label="Submitted this month"
          used={usage.releasesThisMonth}
          limit={usage.releasesLimit}
          hint="Counted on first submit to review. Drafts and resubmits do not add to the quota."
        />
      </section>

      <ReleasesFilter initialQ={q ?? ""} initialStatus={statusFilter} />

      <section className="border border-border bg-card">
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
            <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:flex">
              <span className="w-14 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">Release</span>
              <span className="w-28 shrink-0">Release date</span>
              <span className="w-16 shrink-0 text-right">Tracks</span>
              <span className="w-24 shrink-0 text-right">Status</span>
              <span className="w-8 shrink-0" aria-hidden />
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
                return (
                  <li key={r.id} className="group relative">
                    <Link
                      href={`/dashboard/releases/${r.id}`}
                      className="absolute inset-0 z-0"
                      aria-label={`Open ${title}`}
                    />
                    <div className="pointer-events-none flex items-center gap-4 px-5 py-4 transition-colors duration-200 ease-[var(--ease-rdistro)] group-hover:bg-muted/50">
                      <div className="size-14 shrink-0 overflow-hidden border border-border bg-muted">
                        {artworkUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artworkUrl}
                            alt=""
                            className="size-full object-cover transition-transform duration-300 ease-[var(--ease-rdistro)] group-hover:scale-[1.06]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Disc size={20} weight="regular" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold transition-colors group-hover:text-primary">
                            {title}
                          </p>
                          <span className="sm:hidden">
                            <StatusBadge status={status} />
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {artistName}
                          {r.upc ? ` · UPC ${r.upc}` : ""}
                          <span className="sm:hidden">
                            {dateText ? ` · ${dateText}` : ""}
                            {` · ${trackCount} track${trackCount === 1 ? "" : "s"}`}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Updated {r.updatedAt.toLocaleString()}
                        </p>
                      </div>
                      <span className="hidden w-28 shrink-0 text-sm text-muted-foreground sm:block">
                        {dateText ?? "—"}
                      </span>
                      <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground sm:block">
                        {trackCount}
                      </span>
                      <span className="hidden w-24 shrink-0 text-right sm:block">
                        <StatusBadge status={r.status} />
                      </span>
                      <span className="relative z-10 hidden w-8 shrink-0 sm:block">
                        <Tooltip content="Edit release">
                          <Link
                            href={`/dashboard/releases/${r.id}/edit`}
                            aria-label={`Edit ${title}`}
                            className="pointer-events-auto flex size-8 items-center justify-center border border-border bg-background text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:border-primary/40 hover:text-primary"
                          >
                            <PencilSimple size={14} weight="bold" aria-hidden />
                          </Link>
                        </Tooltip>
                      </span>
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
