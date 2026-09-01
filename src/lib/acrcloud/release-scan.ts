import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { identifyLabelGridAudio, isAcrCloudConfigured, type AcrCloudMatch } from "@/lib/acrcloud/client";
import { resolveReleaseTrackLabelGridId, resolveTrackAudioUrl } from "@/lib/labelgrid/track-audio";

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
};

export type AcrReleaseReport = {
  status: "completed" | "partial" | "failed";
  generatedAt: string;
  results: AcrTrackResult[];
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
  if (!isAcrCloudConfigured()) return false;
  const scheduledAt = new Date(Date.now() + Math.max(0, delayMs));
  await prisma.release.update({
    where: { id: releaseId },
    data: { acrStatus: "pending", acrScheduledAt: scheduledAt, acrError: null },
  });
  return true;
}

export async function runReleaseAcrScan(input: {
  releaseId: string;
  actorUserId?: string | null;
  source: "transcode_webhook" | "manual_refresh";
}): Promise<AcrReleaseReport> {
  if (!isAcrCloudConfigured()) throw new Error("ACRCloud is not configured.");
  await prisma.release.update({
    where: { id: input.releaseId },
    data: {
      acrStatus: "running",
      // A lease lets the durable worker recover any scan whose request is
      // terminated while waiting on LabelGrid or ACRCloud.
      acrScheduledAt: new Date(Date.now() + AUTOMATIC_SCAN_LEASE_MS),
      acrError: null,
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
        const identification = await identifyLabelGridAudio(audio.url);
        results.push({
          trackId: track.id,
          labelgridTrackId: resolvedTrackId,
          trackNumber: track.trackNumber,
          submittedTitle: track.title,
          submittedIsrc: track.isrc,
          ...identification,
          error: null,
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
          error: error instanceof Error ? error.message : "ACR scan failed.",
        });
      }
    }

    const failures = results.filter((result) => result.error).length;
    const status: AcrReleaseReport["status"] =
      failures === 0 ? "completed" : failures === results.length ? "failed" : "partial";
    const report: AcrReleaseReport = {
      status,
      generatedAt: new Date().toISOString(),
      results,
    };
    await prisma.release.update({
      where: { id: input.releaseId },
      data: {
        acrStatus: status,
        acrReportJson: JSON.stringify(report),
        acrFetchedAt: new Date(report.generatedAt),
        acrScheduledAt: null,
        acrError: failures ? `${failures} of ${results.length} track scans failed.` : null,
      },
    });
    await writeAuditLog({
      actorUserId: input.actorUserId ?? null,
      action: "release_acr_scan",
      targetType: "release",
      targetId: input.releaseId,
      summary: `${input.source === "manual_refresh" ? "Refreshed" : "Automatically ran"} ACRCloud recognition for ${results.length} track(s)`,
      metadata: {
        source: input.source,
        recognized: results.filter((result) => result.recognized).length,
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
        acrFetchedAt: new Date(),
      },
    });
    throw error;
  }
}
