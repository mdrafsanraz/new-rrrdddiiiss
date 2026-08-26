import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import {
  ADMIN_RELEASE_FILTERS,
  adminReleaseWhere,
  type AdminReleaseFilter,
} from "@/lib/admin/release-filters";
import { AdminStatusBadge, QcBadge } from "@/components/admin/status-badges";
import { formatShortDate } from "@/lib/admin/format";
import { planLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata = { title: "Releases · Admin" };

type Props = {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
};

export default async function AdminReleasesPage({ searchParams }: Props) {
  await requirePermission("releases.read");
  const sp = await searchParams;
  const filter = (
    ADMIN_RELEASE_FILTERS.some((f) => f.value === sp.filter)
      ? sp.filter
      : "pending_review"
  ) as AdminReleaseFilter;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 40;
  const where = adminReleaseWhere(filter, q);

  const [total, releases] = await Promise.all([
    prisma.release.count({ where }),
    prisma.release.findMany({
      where,
      orderBy: [
        { priorityReview: "desc" },
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, planId: true } },
        artist: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        documents: {
          where: { reviewStatus: "pending" },
          select: { id: true },
        },
        _count: { select: { tracks: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Releases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Moderation queue · {total.toLocaleString()} match
            {total === 1 ? "" : "es"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ADMIN_RELEASE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/releases?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-sm px-2.5 py-1 text-[11px] font-medium",
              filter === f.value
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Title, artist, email, UPC, ISRC, LabelGrid ID…"
          className="h-9 w-full max-w-md rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-foreground/30"
        />
        <button
          type="submit"
          className="h-9 cursor-pointer rounded-md bg-foreground px-3 text-xs font-medium text-background"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Release</th>
              <th className="px-3 py-2 font-semibold">User</th>
              <th className="px-3 py-2 font-semibold">Plan</th>
              <th className="px-3 py-2 font-semibold">Submitted</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">QC</th>
              <th className="px-3 py-2 font-semibold">Docs</th>
              <th className="px-3 py-2 font-semibold">LabelGrid</th>
              <th className="px-3 py-2 font-semibold">Reviewer</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {releases.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  No releases in this view.
                </td>
              </tr>
            ) : (
              releases.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {r.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.artworkUrl}
                          alt=""
                          className="size-9 rounded-sm object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-sm bg-muted" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/releases/${r.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {r.title}
                          {r.priorityReview ? (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase text-amber-800">
                              Priority
                            </span>
                          ) : null}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.artist?.name ?? "—"} · {r.contentType} ·{" "}
                          {r._count.tracks} track
                          {r._count.tracks === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/users/${r.user.id}`}
                      className="block truncate text-xs hover:underline"
                    >
                      {r.user.name}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.user.email}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {planLabel(r.user.planId)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatShortDate(r.submittedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <AdminStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <QcBadge status={r.qcStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {r.documents.length > 0 ? (
                      <span className="font-medium text-amber-900">
                        {r.documents.length} pending
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.labelgridReviewStatus ?? r.labelgridId ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.reviewedBy?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/admin/releases/${r.id}`}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex items-center gap-2 text-xs">
          {page > 1 ? (
            <Link
              href={`/admin/releases?filter=${filter}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="underline-offset-2 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/admin/releases?filter=${filter}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="underline-offset-2 hover:underline"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
