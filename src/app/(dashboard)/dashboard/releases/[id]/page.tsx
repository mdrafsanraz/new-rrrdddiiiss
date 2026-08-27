import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClockCounterClockwise,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SubmitReleaseButton } from "@/components/dashboard/submit-release-button";
import { ResubmitReleaseButton } from "@/components/dashboard/resubmit-release-button";
import { UploadReleaseDocumentForm } from "@/components/dashboard/upload-release-document-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  canUserEditRelease,
  canUserReplaceMedia,
  canUserResubmitRelease,
  canUserSubmitRelease,
  getUserFacingReleaseStatus,
  getUserFacingStatusDescription,
  isFinalRejection,
  normalizeReleaseStatus,
} from "@/lib/releases/status";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";
import { ReplaceReleaseMediaForm } from "@/components/dashboard/replace-release-media-form";

type Props = { params: Promise<{ id: string }> };

const releaseInclude = {
  artist: true,
  tracks: {
    orderBy: { trackNumber: "asc" as const },
    include: { contributors: true },
  },
  reviewIssues: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const }, take: 40 },
  documents: { orderBy: { createdAt: "desc" as const }, take: 20 },
};

export default async function ReleaseDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  let release;
  try {
    release = await prisma.release.findFirst({
      where: { id, userId: user.id },
      include: releaseInclude,
    });
  } catch (error) {
    console.error("[releases/detail] query failed", error);
    // Schema may be mid-sync — retry without newer optional includes.
    release = await prisma.release.findFirst({
      where: { id, userId: user.id },
      include: {
        artist: true,
        tracks: {
          orderBy: { trackNumber: "asc" },
          include: { contributors: true },
        },
      },
    });
    if (release) {
      release = {
        ...release,
        reviewIssues: [],
        activities: [],
        documents: [],
      };
    }
  }
  if (!release) notFound();

  // Best-effort reconciliation — never block the page on LabelGrid latency/errors.
  const normalized = normalizeReleaseStatus(release.status);
  if (
    isLabelGridLive() &&
    release.labelgridId &&
    !release.lastSyncedAt &&
    [
      "labelgrid_in_review",
      "labelgrid_changes_required",
      "labelgrid_approved",
      "delivering",
      "live",
      "submitting_to_labelgrid",
    ].includes(normalized)
  ) {
    try {
      await Promise.race([
        reconcileLabelGridReleaseStatus(release.id, { deep: true }),
        new Promise<{ ok: false }>((resolve) =>
          setTimeout(() => resolve({ ok: false }), 2500)
        ),
      ]);
      release =
        (await prisma.release.findFirst({
          where: { id, userId: user.id },
          include: {
            artist: true,
            tracks: {
              orderBy: { trackNumber: "asc" },
              include: { contributors: true },
            },
            reviewIssues: { orderBy: { createdAt: "desc" } },
            activities: { orderBy: { createdAt: "desc" }, take: 40 },
            documents: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        })) ?? release;
    } catch (error) {
      console.error("[releases/detail] reconcile skipped", error);
    }
  }

  const facing = getUserFacingReleaseStatus(release.status);
  const finalReject = isFinalRejection(release);
  const needsChanges = facing === "changes_required";
  const openIssues = (release.reviewIssues ?? []).filter((i) => !i.resolved);
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  const canSubmit = canUserSubmitRelease(release);
  const canResubmit = canUserResubmitRelease(release);
  const canEdit = canUserEditRelease(release);
  const canReplaceMedia = canUserReplaceMedia(release);
  const tracks = release.tracks ?? [];
  const documents = release.documents ?? [];
  const activities = release.activities ?? [];

  // Artwork/audio live only on LabelGrid now — a set URL means it's there.
  const artworkOnDisk = Boolean(release.artworkUrl);
  const trackMedia = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    trackNumber: t.trackNumber,
    hasAudioOnDisk: Boolean(t.audioUrl),
  }));
  const needsArtwork = !artworkOnDisk;
  const needsAudio = trackMedia.some((t) => !t.hasAudioOnDisk);
  const showMediaReplace =
    canReplaceMedia && (needsArtwork || needsAudio || Boolean(release.syncError));
  const showSentBackNotice =
    normalizeReleaseStatus(release.status) === "ready_to_submit" &&
    Boolean(release.submittedAt) &&
    Boolean(release.reviewNotes);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <Link
            href="/dashboard/releases"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft size={14} weight="bold" aria-hidden />
            Releases
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {release.title}
            </h1>
            <StatusBadge status={release.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {release.artist?.name ?? "No artist"} · {release.catalogNumber}
            {release.upc ? ` · UPC ${release.upc}` : ""}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {getUserFacingStatusDescription(release.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/dashboard/releases/${release.id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
            >
              Edit release
            </Link>
          ) : null}
          {canSubmit ? <SubmitReleaseButton releaseId={release.id} /> : null}
          {canResubmit ? (
            <ResubmitReleaseButton releaseId={release.id} />
          ) : null}
          {finalReject ? (
            <Link
              href="/dashboard/support"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
            >
              Contact support
            </Link>
          ) : null}
        </div>
      </div>

      {showSentBackNotice ? (
        <section className="border border-blue-300 bg-blue-50 p-5 text-sm text-blue-950">
          <p className="font-semibold">Sent back to draft</p>
          <p className="mt-1 whitespace-pre-wrap">{release.reviewNotes}</p>
          <p className="mt-2 text-blue-900/80">
            Use <strong>Edit release</strong> to re-upload artwork and audio,
            then resubmit for review.
          </p>
        </section>
      ) : null}

      {needsChanges ? (
        <section className="border border-amber-500/40 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <WarningCircle
              size={22}
              weight="fill"
              className="mt-0.5 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">Changes Required</p>
              <p className="mt-1 text-sm text-amber-900/85">
                This is not a final rejection. Fix the items below, upload any
                requested documents, then resubmit. Your release will go through
                RDISTRO review again before distribution review continues.
              </p>
              {release.reviewNotes ? (
                <p className="mt-3 whitespace-pre-wrap border-t border-amber-200 pt-3 text-sm">
                  {release.reviewNotes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {openIssues.length === 0 ? (
              <p className="text-sm">
                Review notes are above. Update your release materials, then
                resubmit.
              </p>
            ) : (
              openIssues.map((issue) => (
                <article
                  key={issue.id}
                  className="border border-amber-200/80 bg-white/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                      {issue.category || "Review"}
                    </span>
                    {issue.requiresDocument ? (
                      <span className="text-[11px] font-medium text-amber-900">
                        Document may be required
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">
                    {issue.title || "Issue"}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
                    {issue.message}
                  </p>
                  {issue.requiresDocument || issue.requiresFeedback ? (
                    <UploadReleaseDocumentForm
                      releaseId={release.id}
                      issueId={issue.id}
                      trackId={issue.affectedTrackId}
                    />
                  ) : null}
                </article>
              ))
            )}
          </div>

          {canResubmit ? (
            <div className="mt-5">
              <ResubmitReleaseButton releaseId={release.id} />
            </div>
          ) : null}
        </section>
      ) : null}

      {finalReject ? (
        <section className="border border-red-200 bg-red-50 p-5 text-sm text-red-950">
          <p className="font-semibold">Rejected</p>
          <p className="mt-1">
            This release was rejected and cannot be edited or resubmitted.
            Contact support if you believe this decision needs review.
          </p>
          {(release.internalRejectionReason || release.reviewNotes) && (
            <p className="mt-3 whitespace-pre-wrap border-t border-red-200 pt-3">
              {release.internalRejectionReason || release.reviewNotes}
            </p>
          )}
          <Link
            href="/dashboard/support"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-4 h-9 border-red-300 bg-white px-4 text-red-950"
            )}
          >
            Contact support
          </Link>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <section className="border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Artwork</h2>
          {release.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={release.artworkUrl}
              alt=""
              className="mt-3 aspect-square w-full object-cover"
            />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No artwork yet.</p>
          )}
        </section>

        <section className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Release info</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Status" value={<StatusBadge status={release.status} />} />
            <Row label="Type" value={release.contentType} />
            <Row label="Genre" value={release.primaryGenre ?? "—"} />
            <Row
              label="Release date"
              value={
                release.releaseDate
                  ? release.releaseDate.toLocaleDateString()
                  : "Not set"
              }
            />
            <Row label="UPC" value={release.upc ?? "—"} />
            <Row label="Catalog" value={release.catalogNumber} />
            <Row label="Explicit" value={release.explicit} />
            <Row
              label="Localization"
              value={rMeta.preferredLocalization ?? "—"}
            />
            <Row
              label="First submitted"
              value={
                release.submittedAt
                  ? release.submittedAt.toLocaleString()
                  : "Not submitted"
              }
            />
            {release.priorityReview ? (
              <Row label="Priority" value="Priority review queue" />
            ) : null}
          </dl>
        </section>
      </div>

      <section className="border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Tracks</h2>
        </div>
        <ul className="divide-y divide-border">
          {tracks.map((t) => {
            const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
            return (
              <li key={t.id} className="px-5 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      <span className="mr-3 tabular-nums text-muted-foreground">
                        {String(t.trackNumber).padStart(2, "0")}
                      </span>
                      {t.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.isrc ? `ISRC ${t.isrc}` : "ISRC pending"}
                      {tMeta.audioLanguage
                        ? ` · ${tMeta.audioLanguage}`
                        : ""}
                    </p>
                    {t.contributors.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Credits:{" "}
                        {t.contributors
                          .map((c) => `${c.name} (${c.role})`)
                          .join("; ")}
                      </p>
                    ) : null}
                  </div>
                  {t.audioUrl ? (
                    <audio
                      controls
                      preload="none"
                      src={t.audioUrl}
                      className="h-8 max-w-[240px]"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {documents.length > 0 ? (
        <section className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Uploaded documents</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span>
                  <span className="font-medium">{d.filename}</span>
                  <span className="text-muted-foreground"> · {d.kind}</span>
                </span>
                <a
                  href={d.url}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <ClockCounterClockwise size={16} weight="regular" aria-hidden />
          <h2 className="text-sm font-semibold">Activity</h2>
        </div>
        {activities.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="relative space-y-0 px-5 py-4">
            {activities.map((a, i) => (
              <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
                <span className="mt-1.5 flex flex-col items-center">
                  <span className="size-2.5 shrink-0 bg-primary" />
                  {i < activities.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </span>
                <div className="min-w-0 pb-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {a.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.createdAt.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {release.syncError && facing === "action_required" ? (
        <section className="border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Action required</p>
          <p className="mt-1">{release.syncError}</p>
        </section>
      ) : null}

      {showMediaReplace ? (
        <ReplaceReleaseMediaForm
          releaseId={release.id}
          tracks={trackMedia}
          artworkOnDisk={artworkOnDisk}
          needsArtwork={needsArtwork}
          needsAudio={needsAudio}
        />
      ) : null}

      {release.artist ? (
        <Link
          href={`/dashboard/artists/${release.artist.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          View artist
        </Link>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
