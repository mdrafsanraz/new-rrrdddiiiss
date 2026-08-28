import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUUpLeft,
  Disc,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
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
import { reviewStatusLabel, reviewStatusTone } from "@/lib/labelgrid/state-labels";
import {
  canUserEditRelease,
  canUserResubmitRelease,
  canUserSubmitRelease,
  getUserFacingReleaseStatus,
  getUserFacingStatusDescription,
  isFinalRejection,
  normalizeReleaseStatus,
} from "@/lib/releases/status";
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
  // Refresh the persisted RDISTRO status from LabelGrid on every release-page
  // request. lastSyncedAt is an audit timestamp, not a one-time sync flag.
  // The reconciliation function owns all status mapping and protects local
  // internal-review states from being overwritten by a LabelGrid draft.
  if (isLabelGridLive() && release.labelgridId) {
    try {
      await reconcileLabelGridReleaseStatus(release.id, { deep: true });
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
  let everDelivered = false;

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
      everDelivered = delivery.everDelivered;
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

  const { canDelete, canTakedown, takedownDisabledReason } =
    computeReleaseLifecycleActions({
      everDelivered,
      deliveryState: delivery?.state ?? null,
      isInReview: facing === "in_review",
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
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Disc size={22} weight="regular" aria-hidden />
            </div>
          )}
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
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
        <Callout tone="info" icon={<ArrowUUpLeft size={18} weight="bold" aria-hidden />} title="Sent back to draft">
          <p className="whitespace-pre-wrap">{release.reviewNotes}</p>
          <p className="mt-2 opacity-80">
            Use <strong>Edit Release</strong> to re-upload artwork and audio,
            then resubmit for review.
          </p>
        </Callout>
      ) : null}

      {needsChanges ? (
        <Callout tone="warning" icon={<WarningCircle size={20} weight="fill" aria-hidden />} title="Changes Required">
          <p className="opacity-85">
            This is not a final rejection. Fix the items below, upload any
            requested documents, then resubmit.
          </p>
          {release.reviewNotes ? (
            <p className="mt-3 whitespace-pre-wrap border-t border-amber-200 pt-3 dark:border-amber-500/20">
              {release.reviewNotes}
            </p>
          ) : null}

          <div className="mt-4 space-y-2.5">
            {openIssues.length === 0 ? (
              <p>Review notes are above. Update your release materials, then resubmit.</p>
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
                  <p className="mt-1 leading-relaxed opacity-90">{issue.message}</p>
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
        </Callout>
      ) : null}

      {finalReject ? (
        <Callout tone="danger" icon={<Prohibit size={18} weight="bold" aria-hidden />} title="Rejected">
          <p>
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
        </Callout>
      ) : null}

      {release.syncError && facing === "action_required" ? (
        <Callout tone="warning" icon={<WarningCircle size={18} weight="fill" aria-hidden />} title="Action required">
          <p>{release.syncError}</p>
        </Callout>
      ) : null}

      {/* PAGE CONTENT */}
      {neverSynced ? (
        <div className="border border-border bg-card">
          <EmptyState
            icon={<Disc size={22} weight="regular" aria-hidden />}
            title="Not synced to LabelGrid yet"
            description="Continue the release builder to sync this release to LabelGrid — catalog details will appear here once it has."
          />
        </div>
      ) : liveError ? (
        <Callout tone="warning" icon={<WarningCircle size={18} weight="fill" aria-hidden />} title={liveError}>
          <p className="opacity-80">Refresh the page to try again.</p>
        </Callout>
      ) : live ? (
        <ReleaseTabs
          live={live}
          outletNames={outletNames}
          territoryNames={territoryNames}
          trackDurationsByLgId={trackDurationsByLgId}
          delivery={delivery}
          deliveryError={deliveryError}
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
