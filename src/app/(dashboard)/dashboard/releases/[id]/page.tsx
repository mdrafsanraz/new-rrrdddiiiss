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
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";
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
import { DashboardProviderArtwork } from "@/components/dashboard/provider-media";

type Props = { params: Promise<{ id: string }> };

const releaseInclude = {
  artist: true,
  tracks: {
    orderBy: { trackNumber: "asc" as const },
    include: { contributors: true },
  },
  reviewIssues: {
    orderBy: { createdAt: "desc" as const },
    include: { documents: { select: { id: true } } },
  },
  documents: { orderBy: { createdAt: "desc" as const }, take: 20 },
};

export default async function ReleaseDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  // Reconcile before reading the row used by the primary status badge and
  // permissions. Otherwise a direct visit can keep showing a stale full
  // takedown even while LabelGrid reports the release as still distributed.
  if (isLabelGridLive()) {
    const mapped = await prisma.release.findFirst({
      where: { id, userId: user.id, labelgridId: { not: null } },
      select: { id: true },
    });
    if (mapped) {
      try {
        await withTimeout(
          reconcileLabelGridReleaseStatus(mapped.id, { deep: true }),
          6000,
        );
      } catch (error) {
        console.error("[releases/detail] status reconciliation failed", error);
      }
    }
  }

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
        documents: [],
      };
    }
  }
  if (!release) notFound();

  const facing = getUserFacingReleaseStatus(release.status);
  const finalReject = isFinalRejection(release);
  const needsChanges = facing === "changes_required";
  const openIssues = (release.reviewIssues ?? []).filter((i) => !i.resolved);
  // "Changes required" and "document requested" are two different asks:
  //  - changes required → the user must edit and resubmit through the
  //    builder. Only Edit Release is offered; no standalone Resubmit (that
  //    only makes sense once the edit is actually done) and no Delete.
  //  - document requested → no metadata edit needed, just the upload card.
  //    No Edit, no Delete, and no Resubmit until every requested document
  //    has actually been uploaded — then Resubmit is the only action.
  const documentRequiredIssues = openIssues.filter((i) => i.requiresDocument);
  const documentRequested = documentRequiredIssues.length > 0;
  const documentProvided = documentRequiredIssues.every(
    (i) => ("documents" in i ? i.documents.length : 0) > 0
  );
  const canSubmit = canUserSubmitRelease(release);
  const canResubmit = documentRequested
    ? documentProvided && canUserResubmitRelease(release)
    : !needsChanges && canUserResubmitRelease(release);
  const canEdit = canUserEditRelease(release) && !documentRequested;
  const tracks = release.tracks ?? [];
  const documents = (release.documents ?? []).map((d) => ({
    id: d.id,
    filename: d.filename,
    kind: d.kind,
    url: d.url,
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
          ? "Distribution didn't respond in time."
          : "Could not load current data from distribution.";
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
      deliveryError = "Could not load delivery status.";
      console.error(
        "[releases/detail] delivery fetch failed",
        deliveryResult.reason
      );
    }

    if (outletsResult.status === "fulfilled") outletNames = outletsResult.value;
    if (territoriesResult.status === "fulfilled")
      territoryNames = territoriesResult.value;
  }

  const { canDelete: canDeleteLifecycle, canTakedown, takedownDisabledReason } =
    computeReleaseLifecycleActions({
      everDelivered,
      deliveryState: delivery?.state ?? null,
      isInReview: facing === "in_review",
      isApproved: facing === "approved",
    });
  const canDelete = canDeleteLifecycle && !documentRequested && !needsChanges;

  const trackDurationsByLgId: Record<number, number | null> = {};
  const trackIdsByLgId: Record<number, string> = {};
  for (const t of tracks) {
    if (t.labelgridId && /^\d+$/.test(t.labelgridId)) {
      trackDurationsByLgId[Number(t.labelgridId)] = t.durationMs ?? null;
      trackIdsByLgId[Number(t.labelgridId)] = t.id;
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
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <Link
        href="/dashboard/releases"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Releases
      </Link>

      <header className="grid border border-border bg-card md:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="aspect-square overflow-hidden border-b border-border bg-muted md:border-r md:border-b-0">
          {live?.coverUrl ? (
            <DashboardProviderArtwork releaseId={release.id} className="size-full object-cover" />
          ) : displayArtworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayArtworkUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Disc size={40} weight="regular" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={release.status} />
            {live?.reviewStatus ? (
              <Badge tone={reviewStatusTone(live.reviewStatus)}>
                Distribution: {reviewStatusLabel(live.reviewStatus)}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            {displayTitle}
          </h1>
          <p className="mt-2 text-base font-medium text-muted-foreground sm:text-lg">
            {displayArtist ?? "Artist unavailable"}
          </p>

          <dl className="mt-6 grid grid-cols-2 border border-border sm:grid-cols-4">
            {[
              ["Type", displayContentType],
              ["Release date", displayReleaseDate?.toLocaleDateString()],
              ["Tracks", String(live?.tracks.length ?? tracks.length)],
              ["UPC", displayUpc],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={cn(
                  "min-w-0 p-3.5",
                  index < 3 && "border-r border-border",
                  index < 2 && "max-sm:border-b"
                )}
              >
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="mt-1 truncate text-sm font-semibold">{value || "-"}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {getUserFacingStatusDescription(release.status)}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
            {canSubmit ? <SubmitReleaseButton releaseId={release.id} /> : null}
            {canResubmit && !documentRequested ? (
              <ResubmitReleaseButton releaseId={release.id} />
            ) : null}
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
      </header>

      <section aria-label="Release record" className="grid border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Catalog number", live?.catalogNumber ?? release.catalogNumber],
          ["Distribution ID", release.labelgridId],
          ["Created", release.createdAt.toLocaleDateString()],
          ["Last updated", release.updatedAt.toLocaleString()],
        ].map(([label, value], index) => (
          <dl
            key={label}
            className={cn(
              "min-w-0 p-4",
              index < 3 && "lg:border-r lg:border-border",
              index % 2 === 0 && "max-lg:border-r max-lg:border-border",
              index < 2 && "max-lg:border-b max-lg:border-border"
            )}
          >
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold">{value || "-"}</dd>
          </dl>
        ))}
      </section>

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
            title="Not synced yet"
            description="Continue the release builder to sync this release. Catalog details will appear here once it has."
          />
        </div>
      ) : liveError ? (
        <Callout tone="warning" icon={<WarningCircle size={18} weight="fill" aria-hidden />} title={liveError}>
          <p className="opacity-80">Refresh the page to try again.</p>
        </Callout>
      ) : live ? (
        <ReleaseTabs
          releaseId={release.id}
          live={live}
          outletNames={outletNames}
          territoryNames={territoryNames}
          trackDurationsByLgId={trackDurationsByLgId}
          trackIdsByLgId={trackIdsByLgId}
          delivery={delivery}
          deliveryError={deliveryError}
          documents={documents}
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
