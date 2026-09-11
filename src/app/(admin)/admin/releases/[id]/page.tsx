import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { ReleaseReviewActions } from "@/components/admin/release-review-actions";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { AdminStatusBadge, QcBadge } from "@/components/admin/status-badges";
import { ReleaseQcPanel } from "@/components/admin/release-qc-panel";
import { ReleaseDeliveryPanel } from "@/components/admin/release-delivery-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/plans";
import { formatShortDate, formatDistanceToNow } from "@/lib/admin/format";
import { parseJsonObject, type ReleaseMetadata } from "@/lib/releases/constants";
import { ReleaseReviewWorkspace, RefreshReleaseView } from "@/components/admin/release-review-workspace";
import { adminReviewPipeline } from "@/lib/releases/admin-review-pipeline";
import { parseCachedQcReport } from "@/lib/labelgrid/quality-report";
import { parseReviewQueueStage, reviewQueueStages } from "@/lib/admin/review-queue";
import { canAdminDecide, canAdminDeleteRelease, canAdminSendBackToDraft, getAdminStatusLabel } from "@/lib/releases/status";
import { hasPermission } from "@/lib/auth/permissions";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  getLabelGridMediaStatus,
  isLabelGridDraftMediaReady,
} from "@/lib/labelgrid/catalog";
import { ReplaceReleaseMediaForm } from "@/components/dashboard/replace-release-media-form";
import { ProviderArtwork } from "@/components/admin/provider-artwork";
import { ProviderAudioPlayer } from "@/components/admin/provider-audio-player";
import { DocumentReviewForm } from "@/components/admin/document-review-form";
import { fetchLiveRelease, type LiveRelease } from "@/lib/labelgrid/live-release";
import { ReleaseAcrPanel } from "@/components/admin/release-acr-panel";
import { isAcrCloudConfigured } from "@/lib/acrcloud/client";
import { isAuddConfigured } from "@/lib/audd/client";
import { parseAcrReport } from "@/lib/acrcloud/release-scan";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ queue?: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const r = await prisma.release.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: r ? `${r.title} | Admin` : "Release | Admin" };
}

export default async function AdminReleaseDetailPage({ params, searchParams }: Props) {
  const admin = await requirePermission("releases.read");
  const { id } = await params;

  let release;
  try {
    release = await prisma.release.findUnique({
      where: { id },
      include: {
        user: true,
        artist: true,
        label: true,
        tracks: {
          orderBy: { trackNumber: "asc" },
          include: { contributors: true },
        },
        reviewedBy: { select: { name: true, email: true } },
        reviewIssues: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" }, include: { issue: { select: { id: true, title: true, category: true, message: true } } } },
        activities: { orderBy: { createdAt: "desc" }, take: 40 },
        takedowns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
  } catch (error) {
    console.error("[admin/releases/detail] query failed", error);
    // Fallback without newer relations if schema sync is mid-flight.
    release = await prisma.release.findUnique({
      where: { id },
      include: {
        user: true,
        artist: true,
        label: true,
        tracks: {
          orderBy: { trackNumber: "asc" },
          include: { contributors: true },
        },
        reviewedBy: { select: { name: true, email: true } },
        reviewIssues: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" }, include: { issue: { select: { id: true, title: true, category: true, message: true } } } },
        activities: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    });
  }
  if (!release) notFound();

  const documentIds = release.documents.map((document) => document.id);
  const documentActivities = release.activities.filter((activity) => activity.type.startsWith("document_"));
  const documentPeopleIds = [...new Set([
    ...release.documents.flatMap((document) => [document.uploadedById, document.reviewedById]),
    ...documentActivities.map((activity) => activity.actorUserId),
  ].filter((value): value is string => Boolean(value)))];
  const [documentNotes, documentPeople] = await Promise.all([
    documentIds.length ? prisma.internalNote.findMany({ where: { entityType: "document", entityId: { in: documentIds } }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }) : Promise.resolve([]),
    documentPeopleIds.length ? prisma.user.findMany({ where: { id: { in: documentPeopleIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
  ]);
  const documentPeopleById = new Map(documentPeople.map((person) => [person.id, person]));

  const queueStage = parseReviewQueueStage((await searchParams)?.queue);
  const fromQueue = queueStage !== null;
  let previousQueueId: string | undefined;
  let nextQueueId: string | undefined;
  if (queueStage) {
    const queue = await prisma.release.findMany({
      where: { status: { in: [...reviewQueueStages[queueStage].statuses] } },
      orderBy: [{ priorityReview: "desc" }, { submittedAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const queueIndex = queue.findIndex((item) => item.id === release.id);
    previousQueueId = queueIndex > 0 ? queue[queueIndex - 1]?.id : undefined;
    nextQueueId = queueIndex >= 0 ? queue[queueIndex + 1]?.id : undefined;
  }

  const meta = parseJsonObject(release.metadataJson) as ReleaseMetadata & Record<string, unknown>;
  const pipeline = adminReviewPipeline(release.status);
  const qc = parseCachedQcReport(release.qcReportJson);
  const acrReport = parseAcrReport(release.acrReportJson);
  const acrcloudReport = parseAcrReport(release.acrcloudReportJson) ?? acrReport;
  const auddReport = parseAcrReport(release.auddReportJson) ?? acrReport;
  const stores = safeJsonArray(release.storesJson);
  const territories = safeJsonArray(release.territoriesJson);
  let delivery: Record<string, unknown> | null = null;
  try {
    delivery = JSON.parse(release.deliveryJson || "{}") as Record<
      string,
      unknown
    >;
    if (!delivery || Object.keys(delivery).length === 0) delivery = null;
  } catch {
    delivery = null;
  }

  const canDecide =
    hasPermission(admin.role, "releases.moderate") &&
    canAdminDecide(release.status, release.permanentlyLocked);

  const canSendBackToDraft =
    hasPermission(admin.role, "releases.moderate") &&
    canAdminSendBackToDraft(release.status, release.permanentlyLocked);

  const canDeleteRelease =
    hasPermission(admin.role, "releases.moderate") &&
    canAdminDeleteRelease(release.status);

  const canImpersonate = hasPermission(admin.role, "users.impersonate");

  // Saved links are upload hints only. Provider responses determine media readiness.
  let artworkOnDisk = Boolean(release.artworkUrl);
  let trackMedia = release.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    trackNumber: t.trackNumber,
    hasAudioOnDisk: Boolean(t.audioUrl),
  }));

  let mediaReadyForLg = false;
  let mediaVerified = false;
  let verifiedCover: boolean | null = null;
  let liveRelease: LiveRelease | null = null;
  if (release.labelgridId && isLabelGridLive()) {
    const [mediaResult, liveResult] = await Promise.allSettled([
      getLabelGridMediaStatus(Number(release.labelgridId)),
      fetchLiveRelease(release.userId, Number(release.labelgridId)),
    ]);
    if (mediaResult.status === "fulfilled") {
      mediaVerified = true;
      verifiedCover = mediaResult.value.hasCover;
      artworkOnDisk = verifiedCover;
      trackMedia = release.tracks.map((track) => ({ id: track.id, title: track.title, trackNumber: track.trackNumber, hasAudioOnDisk: mediaResult.value.tracks.some((remote) => remote.id === Number(track.labelgridId) && remote.hasStereo) }));
      mediaReadyForLg = isLabelGridDraftMediaReady(
        mediaResult.value,
        release.tracks.length,
      ) && release.tracks.every((track) => mediaResult.value.tracks.some((remote) => remote.id === Number(track.labelgridId) && remote.hasStereo));
    }
    if (liveResult.status === "fulfilled") liveRelease = liveResult.value;
  }

  const needsArtwork = !artworkOnDisk;
  const needsAudio = trackMedia.some((track) => !track.hasAudioOnDisk);
  const showMediaReplace =
    hasPermission(admin.role, "releases.moderate") &&
    !release.permanentlyLocked &&
    (!release.labelgridId || (mediaVerified && (needsArtwork || needsAudio)));
  const unresolvedIssues = release.reviewIssues.filter((issue) => !issue.resolved);
  const blockingIssues = unresolvedIssues.filter((issue) => issue.isBlocking);
  const pendingDocuments = release.documents.filter((document) => document.reviewStatus === "pending");

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-start gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        {release.labelgridId ? (
          <ProviderArtwork
            releaseId={release.id}
            alt={`${release.title} cover`}
            className="size-24 rounded-xl border border-border object-cover shadow-sm sm:size-32"
          />
        ) : (
          <div className="grid size-24 place-items-center border border-border bg-muted text-[10px] font-semibold text-muted-foreground sm:size-28">NO ARTWORK</div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={fromQueue ? `/admin/review-queue?stage=${queueStage}` : "/admin/releases?filter=pending_review"}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            {fromQueue ? "Back to review queue" : "Back to releases"}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {liveRelease?.title ?? release.title}
            </h1>
            <AdminStatusBadge status={release.status} />
            {release.priorityReview ? (
              <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-950">
                Priority
              </span>
            ) : null}
            <QcBadge status={release.qcStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveRelease?.artist ?? release.artist?.name ?? "No artist"} / {liveRelease?.contentType ?? release.contentType} /{" "}
            {formatShortDate(release.releaseDate)}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Meta label="UPC" value={release.upc ?? "We'll assign one"} />
            <Meta label="Internal ID" value={release.id} mono />
            <Meta
              label="LabelGrid ID"
              value={release.labelgridId ?? "Not synced"}
              mono
            />
            <Meta
              label="User"
              value={
                <Link
                  href={`/admin/users/${release.user.id}`}
                  className="hover:underline"
                >
                  {release.user.name} / {planLabel(release.user.planId)}
                </Link>
              }
            />
            <Meta
              label="Submitted"
              value={
                release.submittedAt
                  ? formatShortDate(release.submittedAt)
                  : "Not submitted"
              }
            />
            <Meta
              label="LG review"
              value={release.labelgridReviewStatus ?? "Not available"}
            />
          </dl>
        </div>
        <div className="flex flex-col gap-2">
          <RefreshReleaseView />
          {fromQueue ? <div className="flex gap-2">
            {previousQueueId ? <Link href={`/admin/releases/${previousQueueId}?queue=${queueStage}${queueStage === "preflight" ? "#qc" : ""}`} className="h-8 border border-border px-3 py-1.5 text-xs font-semibold hover:border-foreground">Previous</Link> : <span className="h-8 border border-border px-3 py-1.5 text-xs text-muted-foreground opacity-50">Previous</span>}
            {nextQueueId ? <Link href={`/admin/releases/${nextQueueId}?queue=${queueStage}${queueStage === "preflight" ? "#qc" : ""}`} className="h-8 border border-foreground bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-85">Next release</Link> : <span className="h-8 border border-border px-3 py-1.5 text-xs text-muted-foreground opacity-50">Next release</span>}
          </div> : null}
          {canImpersonate ? (
            <LoginAsUserButton
              userId={release.user.id}
              userName={release.user.name}
            />
          ) : null}
          <Link
            href={`/admin/users/${release.user.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 px-3 text-xs"
            )}
          >
            User profile
          </Link>
        </div>
      </div>

      <section aria-label="Review pipeline" className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="text-sm font-semibold">Review pipeline</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pipeline.message}</p></div>
          <span className="text-xs text-muted-foreground">Current stage from recorded release status</span>
        </div>
        <ol className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 2xl:grid-cols-6">
          {["Submission", "RDISTRO review", "Preflight QC", "LabelGrid review", "Delivery", "Live"].map((label, index) => <li key={label} aria-current={pipeline.stage === index ? "step" : undefined} className={cn("flex items-center gap-3 bg-card px-4 py-4", pipeline.stage === index && "bg-primary/5")}><span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", pipeline.stage === index ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{index + 1}</span><span className={cn("text-xs font-medium", pipeline.stage !== index && "text-muted-foreground")}>{label}{pipeline.stage === index ? <span className="mt-0.5 block text-[10px] text-primary">Current</span> : null}</span></li>)}
        </ol>
      </section>

      <section aria-label="Release review summary" className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric label="Tracks" value={String(release.tracks.length)} />
        <SummaryMetric label="Open issues" value={String(unresolvedIssues.length)} alert={unresolvedIssues.length > 0} />
        <SummaryMetric label="Blocking" value={String(blockingIssues.length)} alert={blockingIssues.length > 0} />
        <SummaryMetric label="Documents pending" value={String(pendingDocuments.length)} alert={pendingDocuments.length > 0} />
        <SummaryMetric label="Provider media" value={mediaVerified ? mediaReadyForLg ? "Verified" : "Incomplete" : "Unverified"} alert={!mediaReadyForLg} />
      </section>


      {release.syncError ? (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Sync error</p>
          <p className="mt-1 break-words text-xs">{release.syncError}</p>
        </div>
      ) : null}

      {release.labelgridId && (!mediaVerified || !liveRelease) ? <div role="status" className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Provider data is partially unavailable</p><p className="mt-1 text-xs">{!liveRelease ? "Showing saved metadata where live LabelGrid data could not be loaded. " : ""}{!mediaVerified ? "Artwork and audio could not be verified. This does not mean the files are missing. " : ""}Refresh release data to retry.</p></div> : null}

      {showMediaReplace ? (
        <ReplaceReleaseMediaForm
          releaseId={release.id}
          tracks={trackMedia}
          artworkOnDisk={artworkOnDisk}
          needsArtwork={needsArtwork}
          needsAudio={needsAudio}
        />
      ) : null}

      {release.permanentlyLocked ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
          Final rejection. This release is permanently locked, so editing and resubmission are disabled.
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ReleaseReviewWorkspace sections={[
          { id: "catalog", label: "Catalog & media", detail: "Listen, inspect, verify", content: <>
<Section id="overview" title="Release overview" description="Core metadata sent through the catalog and delivery workflow.">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Title" value={liveRelease?.title ?? release.title} />
              <Row label="Type" value={liveRelease?.contentType ?? release.contentType} />
              <Row label="Artist(s)" value={liveRelease?.artist ?? release.artist?.name ?? "Not set"} />
              <Row label="Mix version" value={liveRelease?.mixVersion ?? meta.mixVersion ?? "Not supplied"} />
              <Row label="Catalog number" value={liveRelease?.catalogNumber ?? "Not supplied"} />
              <Row label="Label" value={release.label?.name ?? "RDISTRO"} />
              <Row label="Primary genre" value={liveRelease?.primaryGenre ?? release.primaryGenre ?? "Not set"} />
              <Row
                label="Secondary genre"
                value={String(meta.secondaryGenre ?? meta.secondary_genre ?? "Not set")}
              />
              <Row
                label="Release date"
                value={formatShortDate(release.releaseDate)}
              />
              <Row
                label="Original release date"
                value={String(
                  meta.originalReleaseDate ?? meta.original_release_date ?? "Not set"
                )}
              />
              <Row label="UPC" value={release.upc ?? "Assign on distribute"} />
              <Row
                label="Territories"
                value={
                  liveRelease ? (liveRelease.worldwide ? "Worldwide" : `Worldwide except ${liveRelease.excludedTerritoryCodes.join(", ") || "exclusions unavailable"}`)
                    : meta.worldwide === true ? "Worldwide"
                    : meta.territoryCodes?.length ? meta.territoryCodes.join(", ")
                    : territories.length ? territories.join(", ") : "Not supplied"
                }
              />
              <Row
                label="Stores"
                value={
                  liveRelease?.dspConfigs.length ? `${liveRelease.dspConfigs.filter((outlet) => outlet.enabled).length} of ${liveRelease.dspConfigs.length} configured outlets enabled`
                    : meta.allStores === true ? "All available"
                    : meta.selectedOutletKeys?.length ? meta.selectedOutletKeys.join(", ")
                    : stores.length ? stores.join(", ") : "Not supplied"
                }
              />
              <Row
                label="℗"
                value={String(
                  [liveRelease?.plineYear ?? meta.plineYear, liveRelease?.plineName ?? meta.plineName].filter(Boolean).join(" ") || meta.pLine || meta.pline || meta.copyrightP || "Not set"
                )}
              />
              <Row
                label="©"
                value={String(
                  [liveRelease?.clineYear ?? meta.clineYear, liveRelease?.clineName ?? meta.clineName].filter(Boolean).join(" ") || meta.cLine || meta.cline || meta.copyrightC || "Not set"
                )}
              />
              <Row label="Artwork AI" value={release.artworkAiUsage} />
              <Row label="Explicit (release)" value={release.explicit} />
            </dl>
          </Section>

<Section id="artwork" title="Artwork" description="The release cover currently stored for this catalog record.">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              {release.labelgridId ? <ProviderArtwork releaseId={release.id} alt={`${release.title} artwork`} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square w-full place-items-center border border-dashed border-border bg-muted text-xs text-muted-foreground">No artwork available</div>}
              <dl className="space-y-2 text-sm">
                <Row label="Provider artwork" value={verifiedCover === null ? "Not verified" : verifiedCover ? "Available" : "Not ready"} />
                <Row label="LabelGrid media ready" value={!mediaVerified ? "Not verified" : mediaReadyForLg ? "Yes" : "No"} />
                <Row label="AI usage" value={release.artworkAiUsage} />
              </dl>
            </div>
          </Section>

<Section id="tracks" title="Tracks and audio" description="Track metadata, identifiers, contributors, QC findings, and the submitted master audio.">
            <ul className="space-y-4">
              {release.tracks.map((t) => {
                const tm = parseJsonObject(t.metadataJson) as Record<
                  string,
                  unknown
                >;
                const liveTrack = liveRelease?.tracks.find(
                  (track) =>
                    t.labelgridId ? String(track.id) === t.labelgridId : track.trackNumber === t.trackNumber,
                );
                const displayTitle = liveTrack?.title || t.title;
                const displayArtist =
                  liveTrack?.artist || release.artist?.name || "Not supplied";
                const trackQc = (qc?.issues ?? []).filter((issue) =>
                  (issue.affectedTracks ?? []).some(
                    (at) =>
                      at.id === Number(t.labelgridId) ||
                      at.title.toLowerCase() === displayTitle.toLowerCase()
                  )
                );
                return (
                  <li
                    key={t.id}
                    className="overflow-hidden rounded-xl border border-border bg-muted/10 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {String(liveTrack?.trackNumber ?? t.trackNumber).padStart(2, "0")} / {displayTitle}
                          {liveTrack?.mixVersion ? ` (${liveTrack.mixVersion})` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {displayArtist}
                          {tm.featuredArtists
                            ? ` feat. ${String(tm.featuredArtists)}`
                            : ""}
                          {t.durationMs
                            ? ` / ${formatDuration(t.durationMs)}`
                            : ""}
                        </p>
                      </div>
                      {trackQc && trackQc.length > 0 ? (
                        <span className="text-[11px] font-medium text-amber-900">
                          {trackQc.length} QC issue
                          {trackQc.length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {qc?.generatedAt && qc.hold && !qc.stale && !qc.checksInProgress ? "No track findings reported" : "QC not verified"}
                        </span>
                      )}
                    </div>
                    {release.labelgridId ? (
                      <ProviderAudioPlayer releaseId={release.id} trackId={t.id} />
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No audio uploaded
                      </p>
                    )}
                    <details className="mt-4 rounded-lg border border-border bg-background p-3"><summary className="cursor-pointer text-xs font-semibold">Track metadata, credits & file details</summary>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <Row
                        label="ISRC"
                        value={
                          <span className="inline-flex items-center gap-1">
                            {liveTrack?.isrc ?? t.isrc ?? "Assign later"}
                            {trackQc?.some((i) =>
                              /isrc/i.test(i.code + (i.title ?? ""))
                            ) ? (
                              <span className="text-amber-800">Check</span>
                            ) : null}
                          </span>
                        }
                      />
                      <Row label="ISWC" value={liveTrack?.iswc ?? "Not assigned"} />
                      <Row label="LabelGrid track ID" value={liveTrack?.id ?? t.labelgridId ?? "Not mapped"} />
                      <Row
                        label="Explicit"
                        value={String(liveTrack?.explicit ?? tm.explicit ?? release.explicit)}
                      />
                      <Row
                        label="Composition"
                        value={String(tm.compositionType ?? tm.composition ?? "Not set")}
                      />
                      <Row
                        label="Version"
                        value={String(liveTrack?.mixVersion ?? tm.version ?? tm.mixVersion ?? "Not set")}
                      />
                      <Row
                        label="Audio AI"
                        value={String(tm.audioAiUsage ?? tm.aiUsage ?? tm.ai_usage ?? "Not set")}
                      />
                      <Row
                        label="Samples"
                        value={String(
                          tm.commercialSamples ?? tm.samples ?? "Not set"
                        )}
                      />
                      <Row label="Composition AI" value={String(tm.compositionAiUsage ?? "Not supplied")} />
                      <Row label="Audio language" value={String(tm.audioLanguage ?? "Not supplied")} />
                      <Row label="Recording country" value={String(tm.recordingCountry ?? "Not supplied")} />
                      <Row label="License type" value={String(tm.licenseType ?? "Not supplied")} />
                    </dl>
                    {liveTrack ? (
                      <dl className="mt-3 grid gap-2 border-t border-border/70 pt-3 text-xs sm:grid-cols-3">
                        <Row label="Contributors" value={liveTrack.contributors.length ? liveTrack.contributors.map((person) => `${person.name} (${person.roles.join(", ") || "Role not supplied"})`).join("; ") : "None supplied"} />
                        <Row label="Writers" value={liveTrack.writers.length ? liveTrack.writers.map((person) => `${person.name} · ${person.roles.join(", ")}${person.share !== null ? ` · ${person.share}%` : ""}`).join("; ") : "None supplied"} />
                        <Row label="Publishers" value={liveTrack.publishers.length ? liveTrack.publishers.map((person) => `${person.name}${person.share !== null ? ` · ${person.share}%` : ""}`).join("; ") : "None supplied"} />
                        <Row label="Audio file" value={liveTrack.audio?.filename ?? "Not supplied"} />
                        <Row label="Audio status" value={liveTrack.audio?.status ?? (liveTrack.audio ? "Available" : "Unavailable")} />
                      </dl>
                    ) : t.contributors.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {t.contributors.map((c) => (
                          <li key={c.id}>
                            {c.name} / {c.role}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    </details>
                  </li>
                );
              })}
            </ul>
          </Section>

<Section id="rights" title="Credits and rights" description="Submitted writer, contributor, ownership, and rights information.">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Submitted composition splits
                </p>
                <ul className="mt-1 space-y-1">
                  {meta.writerSplits?.length ? meta.writerSplits.map((writer, index) => <li key={`${writer.writerId}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"><div><span className="font-medium">{writer.firstName} {writer.lastName}</span><p className="text-xs text-muted-foreground">{writer.roles.join(", ")}</p></div><span className="font-mono text-sm">{writer.share}%</span></li>) : <li className="text-muted-foreground">No saved release-level splits. See each track for provider credits.</li>}
                </ul>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row
                  label="℗ owner"
                  value={liveRelease?.plineName ?? meta.plineName ?? "Not set"}
                />
                <Row
                  label="© owner"
                  value={liveRelease?.clineName ?? meta.clineName ?? "Not set"}
                />
              </dl>
            </div>
          </Section>
          </> },
          { id: "analysis", label: "Recognition & QC", detail: "Review analysis reports", content: <>
<ReleaseAcrPanel
            key={`${release.id}:${release.acrcloudFetchedAt?.getTime()}:${release.auddFetchedAt?.getTime()}:${release.acrcloudStatus}:${release.auddStatus}`}
            releaseId={release.id}
            acrConfigured={isAcrCloudConfigured()}
            auddConfigured={isAuddConfigured()}
            canRun={hasPermission(admin.role, "releases.qc")}
            initialAcrcloudReport={acrcloudReport}
            initialAuddReport={auddReport}
            initialAcrcloudStatus={release.acrcloudStatus ?? release.acrStatus}
            initialAuddStatus={release.auddStatus ?? release.acrStatus}
            acrcloudFetchedAt={(release.acrcloudFetchedAt ?? release.acrFetchedAt)?.toISOString() ?? null}
            auddFetchedAt={(release.auddFetchedAt ?? release.acrFetchedAt)?.toISOString() ?? null}
            initialAcrcloudError={release.acrcloudError ?? release.acrError}
            initialAuddError={release.auddError ?? release.acrError}
          />

<section id="qc" className="scroll-mt-20"><ReleaseQcPanel
            key={`${release.id}:${release.qcFetchedAt?.getTime()}`}
            releaseId={release.id}
            labelgridId={release.labelgridId}
            qcEnabled={release.qcEnabled}
            qcStatus={release.qcStatus}
            qcStale={release.qcStale}
            qcChecksInProgress={release.qcChecksInProgress}
            qcFetchedAt={release.qcFetchedAt?.toISOString() ?? null}
            report={qc}
            canRefresh={hasPermission(admin.role, "releases.qc")}
            canConfirm={hasPermission(admin.role, "releases.moderate")}
          /></section>
          </> },
          { id: "evidence", label: "Feedback & documents", detail: "Resolve review requests", content: <>
          <Section id="labelgrid" title="Review feedback" description="RDISTRO change requests and LabelGrid feedback, with their recorded resolution state.">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row
                label="Provider status"
                value={liveRelease?.reviewStatus ?? release.labelgridReviewStatus ?? "Not available"}
              />
              <Row
                label="Local status"
                value={getAdminStatusLabel(release.status)}
              />
              <Row
                label="Last sync"
                value={
                  release.lastSyncedAt
                    ? formatDistanceToNow(release.lastSyncedAt)
                    : "Never"
                }
              />
              <Row
                label="Reviewed by"
                value={
                  release.reviewedBy
                    ? `${release.reviewedBy.name}${
                        release.reviewedAt
                          ? ` / ${formatShortDate(release.reviewedAt)}`
                          : ""
                      }`
                    : "Not reviewed"
                }
              />
            </dl>
            {release.reviewIssues.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {release.reviewIssues
                  .map((issue) => (
                    <li
                      key={issue.id}
                      className="border border-border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        {issue.title ?? issue.code ?? "Issue"}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{issue.source === "LABELGRID" ? "LabelGrid · documents / notes" : "RDISTRO · release changes"} · {issue.resolved ? "Resolved" : issue.isBlocking ? "Open · blocking" : "Open"}{issue.requiresDocument ? " · Document requested" : ""}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {issue.message}
                      </p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No recorded review feedback. New change requests and provider feedback will appear here.
              </p>
            )}
          </Section>

<Section id="documents" title="Documentation and licenses" description="User submissions, review decisions, requested replacements, and document-related changes for this release.">
            {release.documents.length === 0 ? (
              <div className="py-6 text-center"><p className="text-sm font-medium">No documents submitted</p><p className="mt-1 text-xs text-muted-foreground">User uploads and document requests will appear here with their review history.</p></div>
            ) : (
              <div className="space-y-3">{release.documents.map((document) => {
                const uploader = documentPeopleById.get(document.uploadedById);
                const reviewer = document.reviewedById ? documentPeopleById.get(document.reviewedById) : null;
                const track = document.trackId ? release.tracks.find((item) => item.id === document.trackId) : null;
                const notes = documentNotes.filter((note) => note.entityId === document.id);
                return <article key={document.id} className="border border-border bg-background"><div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{document.kind}</h3><span className={cn("px-2 py-0.5 text-[10px] font-semibold capitalize", document.reviewStatus === "approved" ? "bg-emerald-100 text-emerald-800" : document.reviewStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900")}>{document.reviewStatus.replaceAll("_", " ")}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{document.filename} / {document.mimeType}</p><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3"><Meta label="Submitted" value={formatShortDate(document.createdAt)} /><Meta label="Submitted by" value={uploader ? `${uploader.name} / ${uploader.email}` : document.uploadedById === release.userId ? `${release.user.name} / ${release.user.email}` : "User account unavailable"} /><Meta label="Scope" value={track ? `${track.title}${track.isrc ? ` / ${track.isrc}` : ""}` : "Whole release"} /><Meta label="Requested for" value={document.issue?.title ?? document.issue?.category ?? "General evidence"} /><Meta label="Reviewed" value={document.reviewedAt ? formatShortDate(document.reviewedAt) : "Awaiting review"} /><Meta label="Reviewed by" value={reviewer ? reviewer.name : document.reviewedById ? "Staff account unavailable" : "Not reviewed"} /><Meta label="Expires" value={document.expiresAt ? formatShortDate(document.expiresAt) : "No expiry"} /></dl>{document.issue?.message ? <p className="mt-3 border-l-2 border-amber-400 pl-3 text-xs text-muted-foreground">{document.issue.message}</p> : null}{document.reviewNote ? <div className="mt-3 bg-muted/40 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">User-facing review note</p><p className="mt-1 whitespace-pre-wrap text-xs">{document.reviewNote}</p></div> : null}{notes.length ? <div className="mt-3 space-y-2">{notes.map((note) => <div key={note.id} className="border-l-2 border-border pl-3 text-xs"><p className="font-semibold">Internal note by {note.author.name}</p><p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{note.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatShortDate(note.createdAt)}</p></div>)}</div> : null}</div><a href={document.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center border border-border px-3 text-xs font-semibold hover:bg-muted">Open file</a></div>{hasPermission(admin.role, "documents.manage") ? <DocumentReviewForm id={document.id} status={document.reviewStatus} expiresAt={document.expiresAt?.toISOString().slice(0, 10) ?? ""} /> : null}</article>;
              })}</div>
            )}
            {documentActivities.length ? <div className="mt-5 border-t border-border pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document activity</h3><ol className="mt-3 space-y-3">{documentActivities.map((activity) => { const actor = activity.actorUserId ? documentPeopleById.get(activity.actorUserId) : null; return <li key={activity.id} className="grid gap-1 text-xs sm:grid-cols-[120px_1fr]"><time className="text-muted-foreground">{formatDistanceToNow(activity.createdAt)}</time><div><p className="font-semibold">{activity.title}</p><p className="mt-0.5 text-muted-foreground">{activity.description ?? "No additional detail"}{actor ? ` / by ${actor.name}` : ""}</p></div></li>; })}</ol></div> : null}
          </Section>
          </> },
          { id: "distribution", label: "Delivery", detail: "Inspect store responses", content: <>
<section id="delivery" className="scroll-mt-20"><ReleaseDeliveryPanel
            releaseId={release.id}
            deliveryState={release.deliveryState}
            delivery={delivery}
            canSync={hasPermission(admin.role, "releases.moderate")}
          /></section>

<Section id="history" title="Activity and audit history" description="Recorded changes and operational events for this release.">
            {release.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ol className="space-y-3">
                {release.activities.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <time className="w-28 shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(a.createdAt)}
                    </time>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      {a.description ? (
                        <p className="text-xs text-muted-foreground">
                          {a.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          </> },
        ]} />

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Section title="Review attention">
            <ul className="space-y-3 text-xs">
              <li><a href="#tracks" className="flex justify-between gap-3 hover:underline"><span>Artwork & audio</span><span className="font-semibold">{!mediaVerified ? "Not verified" : mediaReadyForLg ? "Verified" : "Incomplete"}</span></a></li>
              <li><a href="#labelgrid" className="flex justify-between gap-3 hover:underline"><span>Unresolved feedback</span><span className="font-semibold">{unresolvedIssues.length} / {blockingIssues.length} blocking</span></a></li>
              <li><a href="#documents" className="flex justify-between gap-3 hover:underline"><span>Documents to review</span><span className="font-semibold">{pendingDocuments.length}</span></a></li>
              <li><a href="#qc" className="block rounded-lg bg-primary/5 px-3 py-2 font-semibold text-primary hover:underline">{release.status === "labelgrid_preflight" ? "Review Preflight & confirm →" : "Open recognition & QC →"}</a></li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">These are recorded checks, not an automatic approval. Review the findings before making a decision.</p>
          </Section>
          {canDecide ||
          hasPermission(admin.role, "releases.moderate") ? (
            <ReleaseReviewActions
              releaseId={release.id}
              canDecide={canDecide}
              canSendBackToDraft={canSendBackToDraft}
              canDelete={canDeleteRelease}
              status={release.status}
              permanentlyLocked={release.permanentlyLocked}
              hasLabelgridId={Boolean(release.labelgridId)}
              mediaReady={mediaReadyForLg}
              mediaVerified={mediaVerified}
            />
          ) : null}

          <Section title="Review notes">
            <p className="text-xs text-muted-foreground">
              User-facing feedback and the internal hold reason are shown separately.
            </p>
            {release.reviewNotes ? (
              <p className="mt-2 whitespace-pre-wrap border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                User-facing notes: {release.reviewNotes}
              </p>
            ) : null}
            {release.holdReason ? (
              <p className="mt-2 whitespace-pre-wrap border border-border bg-muted px-3 py-2 text-xs">
                Hold: {release.holdReason}
              </p>
            ) : null}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function SummaryMetric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("mt-1 text-lg font-semibold tabular-nums", alert && "text-amber-800")}>{value}</p></div>;
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("break-words", mono && "font-mono text-[11px]")}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 max-w-[60%] break-words text-right font-medium">{value}</dd>
    </div>
  );
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function safeJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
