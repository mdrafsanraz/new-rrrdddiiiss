import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { ReleaseReviewActions } from "@/components/admin/release-review-actions";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { AdminStatusBadge, QcBadge } from "@/components/admin/status-badges";
import { ReleaseQcPanel } from "@/components/admin/release-qc-panel";
import { ReleaseDeliveryPanel } from "@/components/admin/release-delivery-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/plans";
import { formatShortDate, formatDistanceToNow } from "@/lib/admin/format";
import { parseJsonObject } from "@/lib/releases/constants";
import { parseCachedQcReport } from "@/lib/labelgrid/quality-report";
import { canAdminDecide, getAdminStatusLabel } from "@/lib/releases/status";
import { hasPermission } from "@/lib/auth/permissions";
import { storedUploadExists } from "@/lib/uploads/store";
import { ReplaceReleaseMediaForm } from "@/components/dashboard/replace-release-media-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const r = await prisma.release.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: r ? `${r.title} · Admin` : "Release · Admin" };
}

export default async function AdminReleaseDetailPage({ params }: Props) {
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
        documents: { orderBy: { createdAt: "desc" } },
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
        documents: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    });
  }
  if (!release) notFound();

  const meta = parseJsonObject(release.metadataJson) as Record<string, unknown>;
  const qc = parseCachedQcReport(release.qcReportJson);
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

  const canImpersonate = hasPermission(admin.role, "users.impersonate");

  const artworkOnDisk = await storedUploadExists(release.artworkUrl);
  const trackMedia = await Promise.all(
    release.tracks.map(async (t) => ({
      id: t.id,
      title: t.title,
      trackNumber: t.trackNumber,
      hasAudioOnDisk: await storedUploadExists(t.audioUrl),
    }))
  );
  const needsArtwork = !artworkOnDisk;
  const needsAudio = trackMedia.some((t) => !t.hasAudioOnDisk);
  const mediaReadyForLg =
    Boolean(release.labelgridId) || (artworkOnDisk && !needsAudio);
  const showMediaReplace =
    hasPermission(admin.role, "releases.moderate") &&
    !release.permanentlyLocked &&
    (needsArtwork || needsAudio || !release.labelgridId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 border-b border-border pb-5">
        {release.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={release.artworkUrl}
            alt=""
            className="size-20 rounded-md object-cover sm:size-24"
          />
        ) : (
          <div className="size-20 rounded-md bg-muted sm:size-24" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/releases?filter=pending_review"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            ← Releases
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {release.title}
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
            {release.artist?.name ?? "No artist"} · {release.contentType} ·{" "}
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
                  {release.user.name} · {planLabel(release.user.planId)}
                </Link>
              }
            />
            <Meta
              label="Submitted"
              value={
                release.submittedAt
                  ? formatShortDate(release.submittedAt)
                  : "—"
              }
            />
            <Meta
              label="LG review"
              value={release.labelgridReviewStatus ?? "—"}
            />
          </dl>
        </div>
        <div className="flex flex-col gap-2">
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

      {release.syncError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Sync error</p>
          <p className="mt-1 break-words text-xs">{release.syncError}</p>
        </div>
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

      {release.permanentlyLocked ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
          Final rejection — permanently locked. Edit and resubmit are disabled.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Overview */}
          <Section title="Overview">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Title" value={release.title} />
              <Row label="Type" value={release.contentType} />
              <Row label="Artist" value={release.artist?.name ?? "—"} />
              <Row label="Label" value={release.label?.name ?? "RDISTRO"} />
              <Row label="Primary genre" value={release.primaryGenre ?? "—"} />
              <Row
                label="Secondary genre"
                value={String(meta.secondaryGenre ?? meta.secondary_genre ?? "—")}
              />
              <Row
                label="Release date"
                value={formatShortDate(release.releaseDate)}
              />
              <Row
                label="Original release date"
                value={String(
                  meta.originalReleaseDate ?? meta.original_release_date ?? "—"
                )}
              />
              <Row label="UPC" value={release.upc ?? "Assign on distribute"} />
              <Row
                label="Territories"
                value={
                  territories.length
                    ? territories.join(", ")
                    : "Worldwide"
                }
              />
              <Row
                label="Stores"
                value={
                  stores.length
                    ? `${stores.length} selected`
                    : "All available"
                }
              />
              <Row
                label="℗"
                value={String(
                  meta.pLine ?? meta.pline ?? meta.copyrightP ?? "—"
                )}
              />
              <Row
                label="©"
                value={String(
                  meta.cLine ?? meta.cline ?? meta.copyrightC ?? "—"
                )}
              />
              <Row label="Artwork AI" value={release.artworkAiUsage} />
              <Row label="Explicit (release)" value={release.explicit} />
            </dl>
          </Section>

          {/* Tracks */}
          <Section title="Tracks / audio">
            <ul className="space-y-4">
              {release.tracks.map((t) => {
                const tm = parseJsonObject(t.metadataJson) as Record<
                  string,
                  unknown
                >;
                const trackQc = (qc?.issues ?? []).filter((issue) =>
                  (issue.affectedTracks ?? []).some(
                    (at) =>
                      at.id === Number(t.labelgridId) ||
                      at.title.toLowerCase() === t.title.toLowerCase()
                  )
                );
                return (
                  <li
                    key={t.id}
                    className="rounded-md border border-border/80 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {String(t.trackNumber).padStart(2, "0")} · {t.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {release.artist?.name}
                          {tm.featuredArtists
                            ? ` feat. ${String(tm.featuredArtists)}`
                            : ""}
                          {t.durationMs
                            ? ` · ${formatDuration(t.durationMs)}`
                            : ""}
                        </p>
                      </div>
                      {trackQc && trackQc.length > 0 ? (
                        <span className="text-[11px] font-medium text-amber-900">
                          ⚠ {trackQc.length} QC issue
                          {trackQc.length === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          QC clear
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                      <Row
                        label="ISRC"
                        value={
                          <span className="inline-flex items-center gap-1">
                            {t.isrc ?? "Assign later"}
                            {trackQc?.some((i) =>
                              /isrc/i.test(i.code + (i.title ?? ""))
                            ) ? (
                              <span className="text-amber-800">⚠</span>
                            ) : null}
                          </span>
                        }
                      />
                      <Row
                        label="Explicit"
                        value={String(tm.explicit ?? release.explicit)}
                      />
                      <Row
                        label="Composition"
                        value={String(tm.compositionType ?? tm.composition ?? "—")}
                      />
                      <Row
                        label="Version"
                        value={String(tm.version ?? tm.mixVersion ?? "—")}
                      />
                      <Row
                        label="AI"
                        value={String(tm.aiUsage ?? tm.ai_usage ?? "—")}
                      />
                      <Row
                        label="Samples"
                        value={String(
                          tm.commercialSamples ?? tm.samples ?? "—"
                        )}
                      />
                    </dl>
                    {t.contributors.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {t.contributors.map((c) => (
                          <li key={c.id}>
                            {c.name} · {c.role}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {t.audioUrl ? (
                      <audio
                        controls
                        preload="none"
                        src={t.audioUrl}
                        className="mt-3 w-full max-w-lg"
                      />
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No audio uploaded
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          <ReleaseQcPanel
            releaseId={release.id}
            labelgridId={release.labelgridId}
            qcEnabled={release.qcEnabled}
            qcStatus={release.qcStatus}
            qcStale={release.qcStale}
            qcChecksInProgress={release.qcChecksInProgress}
            qcFetchedAt={release.qcFetchedAt?.toISOString() ?? null}
            report={qc}
            canRefresh={hasPermission(admin.role, "releases.qc")}
          />

          <Section title="Credits & rights">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Songwriters
                </p>
                <ul className="mt-1 space-y-1">
                  {release.tracks.flatMap((t) =>
                    t.contributors.map((c) => (
                      <li key={c.id} className="text-sm">
                        {c.name}{" "}
                        <span className="text-muted-foreground">· {c.role}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          (track {t.trackNumber})
                        </span>
                      </li>
                    ))
                  )}
                  {release.tracks.every((t) => t.contributors.length === 0) ? (
                    <li className="text-muted-foreground">No writers listed</li>
                  ) : null}
                </ul>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row
                  label="℗ owner"
                  value={String(meta.pLine ?? meta.pline ?? "—")}
                />
                <Row
                  label="© owner"
                  value={String(meta.cLine ?? meta.cline ?? "—")}
                />
              </dl>
            </div>
          </Section>

          <Section title="Documents">
            {release.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {release.documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="font-medium">{d.kind}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.filename} · {d.reviewStatus} ·{" "}
                        {formatShortDate(d.createdAt)}
                      </p>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="LabelGrid review">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row
                label="Provider status"
                value={release.labelgridReviewStatus ?? "draft / unknown"}
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
                          ? ` · ${formatShortDate(release.reviewedAt)}`
                          : ""
                      }`
                    : "—"
                }
              />
            </dl>
            {release.reviewIssues.filter((i) => i.source === "LABELGRID")
              .length > 0 ? (
              <ul className="mt-4 space-y-2">
                {release.reviewIssues
                  .filter((i) => i.source === "LABELGRID")
                  .map((issue) => (
                    <li
                      key={issue.id}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        {issue.title ?? issue.code ?? "Issue"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {issue.message}
                      </p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No LabelGrid review issues cached. Issues appear when status is
                require_changes or rejected.
              </p>
            )}
          </Section>

          <ReleaseDeliveryPanel
            releaseId={release.id}
            deliveryState={release.deliveryState}
            delivery={delivery}
            canSync={hasPermission(admin.role, "releases.moderate")}
          />

          <Section title="Activity / audit">
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
        </div>

        <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">
          {canDecide ||
          hasPermission(admin.role, "releases.moderate") ? (
            <ReleaseReviewActions
              releaseId={release.id}
              canDecide={canDecide}
              status={release.status}
              permanentlyLocked={release.permanentlyLocked}
              hasLabelgridId={Boolean(release.labelgridId)}
              mediaReady={mediaReadyForLg}
            />
          ) : null}

          <Section title="Internal notes">
            <p className="text-xs text-muted-foreground">
              Staff-only. Never shown to the user.
            </p>
            {release.reviewNotes ? (
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                User-facing notes: {release.reviewNotes}
              </p>
            ) : null}
            {release.holdReason ? (
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-950">
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
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
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
      <dd className={cn("truncate", mono && "font-mono text-[11px]")}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
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
