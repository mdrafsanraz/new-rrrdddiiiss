import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { identifyLabelGridAudio, isAcrCloudConfigured, type AcrCloudMatch } from "@/lib/acrcloud/client";
import { identifyAudioUrlWithAudd, isAuddConfigured, type AuddIdentification } from "@/lib/audd/client";
import { resolveReleaseTrackLabelGridId, resolveTrackAudioPreviewUrl, resolveTrackAudioUrl } from "@/lib/labelgrid/track-audio";

export type AcrTrackResult = {
  trackId: string;
  labelgridTrackId: string | null;
  trackNumber: number;
  submittedTitle: string;
  submittedIsrc: string | null;
  recognized: boolean;
  message: string;
  matches: AcrCloudMatch[];
  error: string | null;
  audd?: (AuddIdentification & { error: null }) | { recognized: false; message: string; match: null; error: string } | null;
};

export type AcrReleaseReport = {
  status: "completed" | "partial" | "failed";
  generatedAt: string;
  results: AcrTrackResult[];
  providerReports?: {
    acrcloud: AcrReleaseReport | null;
    audd: AcrReleaseReport | null;
  };
};

const AUTOMATIC_SCAN_LEASE_MS = 10 * 60 * 1000;
const LABELGRID_LOOKUP_TIMEOUT_MS = 30_000;

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), LABELGRID_LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function parseAcrReport(value: string | null | undefined): AcrReleaseReport | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AcrReleaseReport>;
    return parsed.generatedAt && Array.isArray(parsed.results) && parsed.status
      ? (parsed as AcrReleaseReport)
      : null;
  } catch {
    return null;
  }
}

export async function markReleaseAcrPending(
  releaseId: string,
  delayMs = 0,
): Promise<boolean> {
  if (!isAcrCloudConfigured() && !isAuddConfigured()) return false;
  const scheduledAt = new Date(Date.now() + Math.max(0, delayMs));
  const acrConfigured = isAcrCloudConfigured();
  const auddConfigured = isAuddConfigured();
  await prisma.release.update({
    where: { id: releaseId },
    data: {
      acrStatus: "pending",
      acrScheduledAt: scheduledAt,
      acrError: null,
      ...(acrConfigured ? { acrcloudStatus: "pending", acrcloudError: null } : {}),
      ...(auddConfigured ? { auddStatus: "pending", auddError: null } : {}),
    },
  });
  return true;
}

export async function runReleaseAcrScan(input: {
  releaseId: string;
  actorUserId?: string | null;
  source: "transcode_webhook" | "manual_refresh";
  provider?: "acrcloud" | "audd";
}): Promise<AcrReleaseReport> {
  const acrConfigured = isAcrCloudConfigured();
  const auddConfigured = isAuddConfigured();
  const runAcrcloud = acrConfigured && (!input.provider || input.provider === "acrcloud");
  const runAudd = auddConfigured && (!input.provider || input.provider === "audd");
  if (!runAcrcloud && !runAudd) throw new Error(`${input.provider === "audd" ? "AudD" : "ACRCloud"} is not configured.`);
  await prisma.release.update({
    where: { id: input.releaseId },
    data: {
      acrStatus: "running",
      // A lease lets the durable worker recover any scan whose request is
      // terminated while waiting on LabelGrid or ACRCloud.
      acrScheduledAt: new Date(Date.now() + AUTOMATIC_SCAN_LEASE_MS),
      acrError: null,
      ...(runAcrcloud ? { acrcloudStatus: "running", acrcloudError: null } : {}),
      ...(runAudd ? { auddStatus: "running", auddError: null } : {}),
    },
  });

  try {
    const release = await prisma.release.findUnique({
      where: { id: input.releaseId },
      select: {
        labelgridId: true,
        tracks: {
          orderBy: { trackNumber: "asc" },
          select: { id: true, title: true, trackNumber: true, isrc: true, labelgridId: true },
        },
      },
    });
    if (!release) throw new Error("Release not found.");
    if (!release.labelgridId) throw new Error("Release is not synced to LabelGrid.");

    const results: AcrTrackResult[] = [];
    for (const track of release.tracks) {
      let resolvedTrackId: string | null = track.labelgridId;
      try {
        resolvedTrackId = await withTimeout(
          resolveReleaseTrackLabelGridId({
            releaseLabelGridId: release.labelgridId,
            trackLabelGridId: track.labelgridId,
            trackNumber: track.trackNumber,
            isrc: track.isrc,
          }),
          "LabelGrid track lookup timed out.",
        );
        if (!resolvedTrackId) throw new Error("LabelGrid track mapping was not found.");
        const audio = await withTimeout(
          resolveTrackAudioUrl(resolvedTrackId),
          "LabelGrid audio lookup timed out.",
        );
        if (!audio.ok) throw new Error("LabelGrid audio is unavailable.");
        const previewUrl = runAudd
          ? await withTimeout(
              resolveTrackAudioPreviewUrl(resolvedTrackId),
              "LabelGrid preview lookup timed out.",
            )
          : null;
        const [acrResult, auddResult] = await Promise.allSettled([
          runAcrcloud ? identifyLabelGridAudio(audio.url) : Promise.resolve(null),
          runAudd
            ? identifyAudioUrlWithAudd(previewUrl ?? audio.url)
            : Promise.resolve(null),
        ]);
        const identification =
          acrResult.status === "fulfilled" && acrResult.value
            ? acrResult.value
            : { recognized: false, message: runAcrcloud ? "Scan failed" : "Not run", matches: [] };
        const acrError =
          acrResult.status === "rejected"
            ? acrResult.reason instanceof Error
              ? acrResult.reason.message
              : "ACRCloud scan failed."
            : null;
        const audd =
          auddResult.status === "fulfilled"
            ? auddResult.value
              ? { ...auddResult.value, error: null as null }
              : null
            : {
                recognized: false as const,
                message: "Scan failed",
                match: null,
                error: auddResult.reason instanceof Error ? auddResult.reason.message : "AudD scan failed.",
              };
        results.push({
          trackId: track.id,
          labelgridTrackId: resolvedTrackId,
          trackNumber: track.trackNumber,
          submittedTitle: track.title,
          submittedIsrc: track.isrc,
          ...identification,
          error: acrError,
          audd,
        });
      } catch (error) {
        results.push({
          trackId: track.id,
          labelgridTrackId: resolvedTrackId,
          trackNumber: track.trackNumber,
          submittedTitle: track.title,
          submittedIsrc: track.isrc,
          recognized: false,
          message: "Scan failed",
          matches: [],
          error: runAcrcloud ? (error instanceof Error ? error.message : "ACR scan failed.") : null,
          audd: runAudd
            ? { recognized: false, message: "Scan failed", match: null, error: error instanceof Error ? error.message : "AudD scan failed." }
            : null,
        });
      }
    }

    const acrFailures = runAcrcloud
      ? results.filter((result) => Boolean(result.error)).length
      : 0;
    const auddFailures = runAudd
      ? results.filter((result) => Boolean(result.audd?.error)).length
      : 0;
    const failures = results.filter((result) => result.error || result.audd?.error).length;
    const providerStatus = (failureCount: number): AcrReleaseReport["status"] =>
      failureCount === 0 ? "completed" : failureCount === results.length ? "failed" : "partial";
    const status: AcrReleaseReport["status"] =
      failures === 0 ? "completed" : failures === results.length ? "failed" : "partial";
    const generatedAt = new Date().toISOString();
    const acrcloudReport: AcrReleaseReport | null = runAcrcloud
      ? {
          status: providerStatus(acrFailures),
          generatedAt,
          results: results.map((result) => ({ ...result, audd: null })),
        }
      : null;
    const auddReport: AcrReleaseReport | null = runAudd
      ? {
          status: providerStatus(auddFailures),
          generatedAt,
          results: results.map((result) => ({
            trackId: result.trackId,
            labelgridTrackId: result.labelgridTrackId,
            trackNumber: result.trackNumber,
            submittedTitle: result.submittedTitle,
            submittedIsrc: result.submittedIsrc,
            recognized: false,
            message: "Stored in the AudD provider result.",
            matches: [],
            error: null,
            audd: result.audd ?? null,
          })),
        }
      : null;
    const report: AcrReleaseReport = {
      status,
      generatedAt,
      results,
      providerReports: { acrcloud: acrcloudReport, audd: auddReport },
    };
    await prisma.release.update({
      where: { id: input.releaseId },
      data: {
        acrStatus: status,
        acrScheduledAt: null,
        acrError: failures ? `${failures} of ${results.length} track scans failed.` : null,
        ...(!input.provider
          ? {
              acrReportJson: JSON.stringify(report),
              acrFetchedAt: new Date(report.generatedAt),
            }
          : {}),
        ...(acrcloudReport
          ? {
              acrcloudStatus: acrcloudReport.status,
              acrcloudReportJson: JSON.stringify(acrcloudReport),
              acrcloudFetchedAt: new Date(acrcloudReport.generatedAt),
              acrcloudError: acrFailures ? `${acrFailures} of ${results.length} track scans failed.` : null,
            }
          : {}),
        ...(auddReport
          ? {
              auddStatus: auddReport.status,
              auddReportJson: JSON.stringify(auddReport),
              auddFetchedAt: new Date(auddReport.generatedAt),
              auddError: auddFailures ? `${auddFailures} of ${results.length} track scans failed.` : null,
            }
          : {}),
      },
    });
    await writeAuditLog({
      actorUserId: input.actorUserId ?? null,
      action: "release_acr_scan",
      targetType: "release",
      targetId: input.releaseId,
      summary: `${input.source === "manual_refresh" ? "Refreshed" : "Automatically ran"} audio recognition for ${results.length} track(s)`,
      metadata: {
        source: input.source,
        recognized: results.filter((result) => result.recognized).length,
        auddRecognized: results.filter((result) => result.audd?.recognized).length,
        failed: failures,
      },
    });
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ACRCloud scan failed.";
    await prisma.release.update({
      where: { id: input.releaseId },
      data: {
        acrStatus: "failed",
        acrScheduledAt: null,
        acrError: message,
        ...(!input.provider ? { acrFetchedAt: new Date() } : {}),
        ...(runAcrcloud
          ? { acrcloudStatus: "failed", acrcloudError: message, acrcloudFetchedAt: new Date() }
          : {}),
        ...(runAudd
          ? { auddStatus: "failed", auddError: message, auddFetchedAt: new Date() }
          : {}),
      },
    });
    throw error;
  }
}
