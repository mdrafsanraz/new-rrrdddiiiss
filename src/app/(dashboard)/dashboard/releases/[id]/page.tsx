import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react/dist/ssr";
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
  fetchLiveRelease,
  loadOutletNames,
  loadTerritoryNames,
  withTimeout,
  LiveFetchTimeoutError,
  type LiveRelease,
} from "@/lib/labelgrid/live-release";
import { getReleaseDeliveryStatus } from "@/lib/labelgrid";
import { computeReleaseLifecycleActions } from "@/lib/labelgrid/release-actions";
import { syncReleaseQualityReport } from "@/lib/labelgrid/quality-report";
import { reviewStatusLabel, reviewStatusTone } from "@/lib/labelgrid/state-labels";
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
import { ReplaceReleaseMediaForm } from "@/components/dashboard/replace-release-media-form";
import { ReleaseActions } from "@/components/dashboard/release-view/release-actions";
import { Badge } from "@/components/dashboard/release-view/badge";
import {
  ReleaseTabs,
  type DeliveryStatusData,
} from "@/components/dashboard/release-view/release-tabs";

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

  // ---------------------------------------------------------------------
  // Status synchronization — UNCHANGED. Do not modify this block.
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
  // End status synchronization block.
  // ---------------------------------------------------------------------

  const facing = getUserFacingReleaseStatus(release.status);
  const finalReject = isFinalRejection(release);
  const needsChanges = facing === "changes_required";
  const openIssues = (release.reviewIssues ?? []).filter((i) => !i.resolved);
  const canSubmit = canUserSubmitRelease(release);
  const canResubmit = canUserResubmitRelease(release);
  const canEdit = canUserEditRelease(release);
  const canReplaceMedia = canUserReplaceMedia(release);
  const tracks = release.tracks ?? [];
  const documents = (release.documents ?? []).map((d) => ({
    id: d.id,
    filename: d.filename,
    kind: d.kind,
    url: d.url,
  }));
  const activities = (release.activities ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
  }));
  const showSentBackNotice =
    normalizeReleaseStatus(release.status) === "ready_to_submit" &&
    Boolean(release.submittedAt) &&
    Boolean(release.reviewNotes);

  // ---------------------------------------------------------------------
  // LabelGrid is the source of truth for catalog/release data. Local DB
  // above supplies only ownership + the labelgridId. Every fetch here is
  // best-effort and additive — nothing here writes to the status-sync
  // fields (status, deliveryState, labelgridReviewStatus, qc*), which
  // remain exclusively owned by the block above / status-sync.ts.
  let live: LiveRelease | null = null;
  let liveError: string | null = null;
  let delivery: DeliveryStatusData | null = null;
  let deliveryError: string | null = null;
  let outletNames: Record<string, string> = {};
  let territoryNames: Record<string, string> = {};
  let everSubmitted = false;

  if (isLabelGridLive() && release.labelgridId) {
    const lgId = Number(release.labelgridId);

    const [liveResult, deliveryResult, outletsResult, territoriesResult] =
      await Promise.allSettled([
        withTimeout(fetchLiveRelease(user.id, lgId), 8000),
        withTimeout(getReleaseDeliveryStatus(lgId), 6000),
        withTimeout(loadOutletNames(), 6000),
        withTimeout(loadTerritoryNames(), 6000),
      ]);

    if (liveResult.status === "fulfilled") {
      live = liveResult.value;
    } else {
      liveError =
        liveResult.reason instanceof LiveFetchTimeoutError
          ? "LabelGrid did not respond in time."
          : "Could not load current data from LabelGrid.";
      console.error("[releases/detail] live fetch failed", liveResult.reason);
    }

    if (deliveryResult.status === "fulfilled") {
      const raw = deliveryResult.value;
      const d =
        raw && typeof raw === "object" && "data" in raw
          ? (raw as { data: Record<string, unknown> }).data
          : (raw as Record<string, unknown>);
      delivery = {
        state: String(d.state ?? "not_submitted"),
        currentlyLive: Boolean(d.currently_live),
        everSubmitted: Boolean(d.ever_submitted),
        everDelivered: Boolean(d.ever_delivered),
        outlets: Array.isArray(d.outlets)
          ? (d.outlets as DeliveryStatusData["outlets"])
          : [],
      };
      everSubmitted = delivery.everSubmitted;
    } else {
      deliveryError = "Could not load delivery status from LabelGrid.";
      console.error(
        "[releases/detail] delivery fetch failed",
        deliveryResult.reason
      );
    }

    if (outletsResult.status === "fulfilled") outletNames = outletsResult.value;
    if (territoriesResult.status === "fulfilled")
      territoryNames = territoriesResult.value;
  }

  const qcSync = release.labelgridId
    ? await syncReleaseQualityReport(release.id).catch(() => ({
        ok: false as const,
        error: "Could not load Preflight QC.",
      }))
    : null;
  const qcReport = qcSync?.ok ? (qcSync.report ?? null) : null;
  const qcError = qcSync && !qcSync.ok ? qcSync.error ?? null : null;

  const { canDelete, canTakedown, takedownDisabledReason } =
    computeReleaseLifecycleActions({
      everSubmitted,
      deliveryState: delivery?.state ?? null,
    });

  const trackDurationsByLgId: Record<number, number | null> = {};
  for (const t of tracks) {
    if (t.labelgridId && /^\d+$/.test(t.labelgridId)) {
      trackDurationsByLgId[Number(t.labelgridId)] = t.durationMs ?? null;
    }
  }

  // Header display fields — live only when available; local only for a
  // release that has never synced to LabelGrid at all (nothing live exists
  // yet to prefer). A release whose live fetch merely FAILED shows the
  // error banner instead of silently substituting stale local values.
  const neverSynced = !release.labelgridId;
  // The title text is the one exception to "no stale fallback": the page
  // needs a heading to render even mid-error, and a release title is not
  // meaningfully "stale catalog data" the way artwork/UPC/dates are.
  const displayTitle = live?.title ?? release.title;
  const displayArtist =
    live?.artist ?? (neverSynced ? release.artist?.name ?? "No artist" : null);
  const displayArtworkUrl = live?.coverUrl ?? (neverSynced ? release.artworkUrl : null);
  const displayUpc = live?.barcodeNumber ?? (neverSynced ? release.upc : null);
  const displayContentType = live?.contentType ?? (neverSynced ? release.contentType : null);
  const displayReleaseDate = live?.releaseDate
    ? new Date(live.releaseDate)
    : neverSynced
      ? release.releaseDate
      : null;

  // Media-replace nudge: prefer LabelGrid's actual file presence per track
  // (matched by labelgridId) over the local cache.
  const liveAudioPresentByLgTrackId = new Map(
    (live?.tracks ?? []).map((lt) => [String(lt.id), Boolean(lt.audio?.url)])
  );
  const artworkOnDisk = live ? Boolean(live.coverUrl) : Boolean(release.artworkUrl);
  const trackMedia = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    trackNumber: t.trackNumber,
    hasAudioOnDisk:
      t.labelgridId && liveAudioPresentByLgTrackId.has(t.labelgridId)
        ? liveAudioPresentByLgTrackId.get(t.labelgridId)!
        : Boolean(t.audioUrl),
  }));
  const needsArtwork = !artworkOnDisk;
  const needsAudio = trackMedia.some((t) => !t.hasAudioOnDisk);
  const showMediaReplace =
    canReplaceMedia && (needsArtwork || needsAudio || Boolean(release.syncError));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/releases"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Releases
      </Link>

      {/* HEADER */}
      <div className="flex flex-wrap items-start gap-5 border-b border-border pb-6">
        <div className="size-20 shrink-0 overflow-hidden border border-border bg-muted">
          {displayArtworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayArtworkUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {displayTitle}
            </h1>
            <StatusBadge status={release.status} />
            {live?.reviewStatus ? (
              <Badge tone={reviewStatusTone(live.reviewStatus)}>
                LabelGrid: {reviewStatusLabel(live.reviewStatus)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {displayArtist ?? "—"}
            {displayUpc ? ` · UPC ${displayUpc}` : ""}
            {displayContentType ? ` · ${displayContentType}` : ""}
            {displayReleaseDate ? ` · ${displayReleaseDate.toLocaleDateString()}` : ""}
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {getUserFacingStatusDescription(release.status)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canSubmit ? <SubmitReleaseButton releaseId={release.id} /> : null}
            {canResubmit ? <ResubmitReleaseButton releaseId={release.id} /> : null}
            {!finalReject ? (
              <ReleaseActions
                releaseId={release.id}
                canEdit={canEdit}
                canDelete={canDelete}
                canTakedown={canTakedown}
                takedownDisabledReason={takedownDisabledReason}
                title={displayTitle}
                artist={displayArtist}
                upc={displayUpc}
                deliveryState={delivery?.state ?? null}
              />
            ) : null}
            {finalReject ? (
              <Link
                href="/dashboard/support"
                className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
              >
                Contact support
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {showSentBackNotice ? (
        <section className="border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <p className="font-semibold">Sent back to draft</p>
          <p className="mt-1 whitespace-pre-wrap">{release.reviewNotes}</p>
          <p className="mt-2 opacity-80">
            Use <strong>Edit Release</strong> to re-upload artwork and audio,
            then resubmit for review.
          </p>
        </section>
      ) : null}

      {needsChanges ? (
        <section className="border border-amber-500/40 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Changes Required</p>
              <p className="mt-1 text-sm opacity-85">
                This is not a final rejection. Fix the items below, upload any
                requested documents, then resubmit.
              </p>
              {release.reviewNotes ? (
                <p className="mt-3 whitespace-pre-wrap border-t border-amber-200 pt-3 text-sm dark:border-amber-500/20">
                  {release.reviewNotes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {openIssues.length === 0 ? (
              <p className="text-sm">Review notes are above. Update your release materials, then resubmit.</p>
            ) : (
              openIssues.map((issue) => (
                <article key={issue.id} className="border border-amber-200/80 bg-white/70 p-3.5 dark:border-amber-500/20 dark:bg-black/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                      {issue.category || "Review"}
                    </span>
                    {issue.requiresDocument ? (
                      <span className="text-[11px] font-medium">Document may be required</span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{issue.title || "Issue"}</h3>
                  <p className="mt-1 text-sm leading-relaxed opacity-90">{issue.message}</p>
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
            <div className="mt-4">
              <ResubmitReleaseButton releaseId={release.id} />
            </div>
          ) : null}
        </section>
      ) : null}

      {finalReject ? (
        <section className="border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          <p className="font-semibold">Rejected</p>
          <p className="mt-1">
            This release was rejected and cannot be edited or resubmitted.
            Contact support if you believe this decision needs review.
          </p>
          {(release.internalRejectionReason || release.reviewNotes) && (
            <p className="mt-3 whitespace-pre-wrap border-t border-red-200 pt-3 dark:border-red-900/30">
              {release.internalRejectionReason || release.reviewNotes}
            </p>
          )}
          <Link
            href="/dashboard/support"
            className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-9 px-4")}
          >
            Contact support
          </Link>
        </section>
      ) : null}

      {release.syncError && facing === "action_required" ? (
        <section className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
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

      {/* PAGE CONTENT */}
      {neverSynced ? (
        <section className="border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm font-medium">Not synced to LabelGrid yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Continue the release builder to sync this release to LabelGrid —
            catalog details will appear here once it has.
          </p>
        </section>
      ) : liveError ? (
        <section className="border border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-medium">{liveError}</p>
          <p className="mt-1 opacity-80">Refresh the page to try again.</p>
        </section>
      ) : live ? (
        <ReleaseTabs
          live={live}
          outletNames={outletNames}
          territoryNames={territoryNames}
          trackDurationsByLgId={trackDurationsByLgId}
          delivery={delivery}
          deliveryError={deliveryError}
          qc={qcReport}
          qcError={qcError}
          documents={documents}
          activities={activities}
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
