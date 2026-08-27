import Link from "next/link";
import { Disc } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ReleasesFilter } from "@/components/dashboard/releases-filter";
import { statusesForUserFacingFilter } from "@/lib/releases/status";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  fetchLiveReleaseSummary,
  withTimeout,
  type LiveReleaseSummary,
} from "@/lib/labelgrid/live-release";

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

  const liveByLabelgridId = await fetchLiveSummaries(
    releases
      .map((r) => r.labelgridId)
      .filter((id): id is string => Boolean(id))
  );

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
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
              <Disc size={22} weight="regular" aria-hidden />
            </div>
            <p className="mt-4 font-semibold">No releases match</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Create a release to start the RDISTRO review workflow.
            </p>
            <Link
              href="/dashboard/releases/new"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-5 h-9 px-4"
              )}
            >
              Create release
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {releases.map((r) => {
              const live = r.labelgridId
                ? liveByLabelgridId.get(r.labelgridId)
                : undefined;
              const title = live?.title ?? r.title;
              const artworkUrl = live?.coverUrl ?? r.artworkUrl;
              const artistName = live?.artist ?? r.artist?.name ?? "No artist";
              const trackCount = live?.trackCount ?? r._count.tracks;
              return (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/releases/${r.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="size-14 shrink-0 overflow-hidden border border-border bg-muted">
                      {artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artworkUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Disc size={20} weight="regular" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{title}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {artistName}
                        {r.upc ? ` · UPC ${r.upc}` : ""}
                        {live?.releaseDate
                          ? ` · ${new Date(live.releaseDate).toLocaleDateString()}`
                          : r.releaseDate
                            ? ` · ${r.releaseDate.toLocaleDateString()}`
                            : ""}
                        {` · ${trackCount} track${trackCount === 1 ? "" : "s"}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Updated {r.updatedAt.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
