import Link from "next/link";
import { AssignReleaseButton } from "@/components/admin/assign-release-button";
import { AdminStatusBadge, QcBadge } from "@/components/admin/status-badges";
import { ProviderArtwork } from "@/components/admin/provider-artwork";
import { formatDistanceToNow, formatShortDate } from "@/lib/admin/format";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Review Queue | Admin" };
const pendingStatuses = ["pending_internal_review", "submitted", "in_review"] as const;

export default async function ReviewQueuePage() {
  const admin = await requirePermission("releases.read");
  const where = { status: { in: [...pendingStatuses] } };
  const releases = await prisma.release.findMany({
    where,
    orderBy: [{ priorityReview: "desc" }, { submittedAt: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true } }, artist: { select: { name: true } }, reviewedBy: { select: { id: true, name: true } },
      documents: { where: { reviewStatus: "pending" }, select: { id: true } }, reviewIssues: { where: { resolved: false }, select: { id: true, isBlocking: true } }, _count: { select: { tracks: true } },
    },
  });
  const oldest = releases.reduce<Date | null>((value, release) => {
    const date = release.submittedAt ?? release.createdAt;
    return !value || date < value ? date : value;
  }, null);
  const priority = releases.filter((release) => release.priorityReview).length;
  const mine = releases.filter((release) => release.reviewedById === admin.id).length;
  const unassigned = releases.filter((release) => !release.reviewedById).length;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily moderation</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Review queue</h1><p className="mt-1 text-sm text-muted-foreground">Priority releases appear first. Within each priority level, the oldest submission is first.</p></div>
      <Link href="/admin/releases" className="h-9 border border-border px-4 py-2 text-xs font-semibold hover:border-foreground">Search all releases</Link>
    </header>
    <section className="grid border border-border bg-card sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Waiting" value={releases.length.toLocaleString()} alert={releases.length > 0} />
      <Metric label="Oldest waiting" value={oldest ? formatDistanceToNow(oldest) : "Queue clear"} alert={Boolean(oldest)} />
      <Metric label="Priority" value={priority.toLocaleString()} alert={priority > 0} />
      <Metric label="Assigned to you" value={mine.toLocaleString()} />
      <Metric label="Unassigned" value={unassigned.toLocaleString()} alert={unassigned > 0} />
    </section>
    <div className="flex items-center justify-between border-y border-border py-2 text-xs"><p><span className="font-semibold">{releases.length.toLocaleString()}</span> <span className="text-muted-foreground">releases awaiting RDISTRO review</span></p><p className="text-muted-foreground">Priority, then oldest submitted</p></div>
    <section className="overflow-hidden border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm">
      <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Position</th><th className="px-3 py-3">Release</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Waiting</th><th className="px-3 py-3">Review health</th><th className="px-3 py-3">Reviewer</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
      <tbody className="divide-y divide-border">{!releases.length ? <tr><td colSpan={7} className="px-4 py-16 text-center"><p className="font-medium">The review queue is clear</p><p className="mt-1 text-xs text-muted-foreground">Newly submitted releases will appear here automatically.</p></td></tr> : releases.map((release, index) => {
        const waitingSince = release.submittedAt ?? release.createdAt;
        const blocking = release.reviewIssues.filter((issue) => issue.isBlocking).length;
        return <tr key={release.id} className="align-top hover:bg-muted/25">
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</td>
          <td className="px-3 py-3"><div className="flex gap-3">{release.labelgridId ? <ProviderArtwork releaseId={release.id} className="size-11 shrink-0 object-cover" /> : <div className="grid size-11 place-items-center border border-border bg-muted text-[9px] text-muted-foreground">NO ART</div>}<div className="min-w-0"><Link href={`/admin/releases/${release.id}?queue=pending`} className="block max-w-64 truncate font-semibold hover:underline">{release.title}</Link><p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground">{release.artist?.name ?? "Artist not set"} / {release._count.tracks} track{release._count.tracks === 1 ? "" : "s"}</p>{release.priorityReview ? <span className="mt-1 inline-block bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">Priority</span> : null}</div></div></td>
          <td className="px-3 py-3"><Link href={`/admin/users/${release.user.id}`} className="block max-w-44 truncate text-xs font-medium hover:underline">{release.user.name}</Link><p className="max-w-44 truncate text-[10px] text-muted-foreground">{release.user.email}</p></td>
          <td className="px-3 py-3"><p className="text-xs font-semibold">{formatDistanceToNow(waitingSince)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Submitted {formatShortDate(release.submittedAt)}</p></td>
          <td className="px-3 py-3"><div className="flex gap-1"><AdminStatusBadge status={release.status} /><QcBadge status={release.qcStatus} /></div><p className="mt-1.5 text-[10px] text-muted-foreground">{blocking} blocking / {release.documents.length} docs pending</p></td>
          <td className="px-3 py-3">{release.reviewedBy ? <p className="text-xs font-medium">{release.reviewedBy.name}</p> : <p className="text-xs text-muted-foreground">Unassigned</p>}<div className="mt-1.5"><AssignReleaseButton releaseId={release.id} assignedToMe={release.reviewedById === admin.id} /></div></td>
          <td className="px-4 py-3 text-right"><Link href={`/admin/releases/${release.id}?queue=pending`} className="inline-flex h-8 items-center border border-foreground bg-foreground px-3 text-[11px] font-semibold text-background hover:opacity-85">Review now</Link></td>
        </tr>;
      })}</tbody>
    </table></div></section>
  </div>;
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-semibold tabular-nums ${alert ? "text-amber-800" : ""}`}>{value}</p></div>;
}
