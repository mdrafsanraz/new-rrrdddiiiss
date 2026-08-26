import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { ReleaseReviewActions } from "@/components/admin/release-review-actions";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function AdminReleaseDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      user: true,
      artist: true,
      tracks: { orderBy: { trackNumber: "asc" } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });
  if (!release) notFound();

  const canDecide = ["in_review", "submitted", "error"].includes(release.status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/releases?status=in_review"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Queue
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{release.title}</h1>
            <StatusBadge status={release.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {release.catalogNumber}
            {release.artist ? ` · ${release.artist.name}` : ""}
          </p>
        </div>
        <LoginAsUserButton
          userId={release.user.id}
          userName={release.user.name}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Submitter</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Name" value={release.user.name} />
            <Row label="Email" value={release.user.email} />
            <Row label="Plan" value={release.user.planId} />
            <Row
              label="Submitted"
              value={
                release.submittedAt
                  ? release.submittedAt.toLocaleString()
                  : "—"
              }
            />
          </dl>
          <Link
            href={`/admin/users/${release.user.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-4 h-8 px-3 text-xs"
            )}
          >
            Manage user
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Release</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Type" value={release.contentType} />
            <Row label="Genre" value={release.primaryGenre ?? "—"} />
            <Row label="Explicit" value={release.explicit} />
            <Row label="Artwork AI" value={release.artworkAiUsage} />
            <Row
              label="LabelGrid ID"
              value={release.labelgridId ?? "Not synced"}
            />
            {release.reviewedBy ? (
              <Row
                label="Reviewed by"
                value={`${release.reviewedBy.name} · ${
                  release.reviewedAt?.toLocaleString() ?? ""
                }`}
              />
            ) : null}
          </dl>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Artwork</h2>
          {release.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={release.artworkUrl}
              alt=""
              className="mt-4 aspect-square w-48 rounded-lg object-cover"
            />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No artwork</p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Tracks</h2>
          <ul className="mt-4 space-y-4">
            {release.tracks.map((t) => (
              <li key={t.id} className="text-sm">
                <p className="font-medium">
                  {String(t.trackNumber).padStart(2, "0")} · {t.title}
                </p>
                {t.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={t.audioUrl}
                    className="mt-2 w-full max-w-md"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {release.reviewNotes ? (
        <section className="rounded-xl border border-border bg-muted/40 p-5 text-sm">
          <p className="font-semibold">Review notes</p>
          <p className="mt-1 whitespace-pre-wrap">{release.reviewNotes}</p>
        </section>
      ) : null}

      {release.syncError ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">LabelGrid sync error</p>
          <p className="mt-1 break-words">{release.syncError}</p>
        </section>
      ) : null}

      {canDecide ? <ReleaseReviewActions releaseId={release.id} /> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
