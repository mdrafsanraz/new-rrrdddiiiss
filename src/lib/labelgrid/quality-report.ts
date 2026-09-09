import { prisma } from "@/lib/db";
import {
  getReleaseQualityReport,
  refreshReleaseQualityReport,
} from "@/lib/labelgrid";
import { LabelGridApiError, labelGridApiErrorMessage } from "@/lib/labelgrid/client";
import { deriveQcStatus } from "./qc-state";

export type QcIssue = {
  id: string;
  code: string;
  title: string | null;
  message: string | null;
  status: string;
  severity: string;
  isBlocking: boolean;
  requiresFeedback: boolean;
  customDescription: string | null;
  affectedTracks: Array<{ id: number; title: string; mixVersion: string }>;
  evidence: Array<Record<string, unknown>>;
};

export type QcReportSnapshot = {
  enabled: boolean;
  status: string;
  stale: boolean;
  checksInProgress: boolean;
  hold: boolean;
  generatedAt: string | null;
  reviewStatus?: string | null;
  releaseStatus?: string | null;
  profile: { name: string; version: number } | null;
  issues: QcIssue[];
  raw: unknown;
};

/**
 * Fetch Preflight QC for a release and cache on the local row.
 * If QC is not enabled on the LabelGrid account, mark qcEnabled=false.
 */
export async function syncReleaseQualityReport(localReleaseId: string): Promise<{
  ok: boolean;
  report?: QcReportSnapshot;
  error?: string;
}> {
  const release = await prisma.release.findUnique({
    where: { id: localReleaseId },
    select: { id: true, labelgridId: true },
  });
  if (!release?.labelgridId) {
    return { ok: false, error: "Release is not synced to LabelGrid yet." };
  }

  try {
    const raw = await getReleaseQualityReport(release.labelgridId);
    const data =
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data: NonNullable<QcReportSnapshot["raw"]> & {
            issues?: Array<Record<string, unknown>>;
            report?: Record<string, unknown>;
          } }).data
        : (raw as {
            issues?: Array<Record<string, unknown>>;
            report?: Record<string, unknown>;
          });

    const reportMeta = (data.report ?? {}) as {
      generated_at?: string | null;
      checks_in_progress?: boolean;
      stale?: boolean;
      hold?: boolean;
      review_status?: string | null;
      release_status?: string | null;
      profile?: { name: string; version: number };
    };

    const issues: QcIssue[] = (data.issues ?? []).map((issue) => ({
      id: String(issue.id ?? ""),
      code: String(issue.code ?? ""),
      title: (issue.title as string | null) ?? null,
      message: (issue.message as string | null) ?? null,
      status: String(issue.status ?? ""),
      severity: String(issue.severity ?? ""),
      isBlocking: Boolean(issue.is_blocking),
      requiresFeedback: Boolean(issue.requires_feedback),
      customDescription:
        (issue.custom_description as string | null) ?? null,
      affectedTracks: Array.isArray(issue.affected_tracks)
        ? (
            issue.affected_tracks as Array<{
              id: number;
              title: string;
              mix_version: string;
            }>
          ).map((t) => ({
            id: t.id,
            title: t.title,
            mixVersion: t.mix_version,
          }))
        : [],
      evidence: Array.isArray(issue.evidence)
        ? (issue.evidence as Array<Record<string, unknown>>)
        : [],
    }));

    const status = deriveQcStatus({
      checksInProgress: Boolean(reportMeta.checks_in_progress),
      stale: Boolean(reportMeta.stale),
      hold: Boolean(reportMeta.hold),
      generatedAt: reportMeta.generated_at ?? null,
      issues,
    });

    const snapshot: QcReportSnapshot = {
      enabled: true,
      status,
      stale: Boolean(reportMeta.stale),
      checksInProgress: Boolean(reportMeta.checks_in_progress),
      hold: Boolean(reportMeta.hold),
      generatedAt: reportMeta.generated_at ?? null,
      reviewStatus: reportMeta.review_status ?? null,
      releaseStatus: reportMeta.release_status ?? null,
      profile: reportMeta.profile ?? null,
      issues,
      raw: data,
    };

    await prisma.release.update({
      where: { id: localReleaseId },
      data: {
        qcEnabled: true,
        qcStatus: status,
        qcStale: snapshot.stale,
        qcChecksInProgress: snapshot.checksInProgress,
        qcFetchedAt: new Date(),
        qcReportJson: JSON.stringify(snapshot),
      },
    });

    return { ok: true, report: snapshot };
  } catch (error) {
    if (error instanceof LabelGridApiError) {
      const code = String(
        (error.body as { error?: string; code?: string } | null)?.error ??
          (error.body as { code?: string } | null)?.code ??
          ""
      ).toLowerCase();
      if (
        code.includes("pre_review_qc_not_enabled") ||
        code.includes("qc_not_enabled")
      ) {
        await prisma.release.update({
          where: { id: localReleaseId },
          data: {
            qcEnabled: false,
            qcStatus: "not_enabled",
            qcFetchedAt: new Date(),
            qcReportJson: JSON.stringify({
              enabled: false,
              status: "not_enabled",
              issues: [],
            }),
          },
        });
        return {
          ok: true,
          report: {
            enabled: false,
            status: "not_enabled",
            stale: false,
            checksInProgress: false,
            hold: false,
            generatedAt: null,
            profile: null,
            issues: [],
            raw: error.body,
          },
        };
      }
      return {
        ok: false,
        error: labelGridApiErrorMessage(error),
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "QC sync failed",
    };
  }
}

export async function requestQualityReportRefresh(localReleaseId: string) {
  const release = await prisma.release.findUnique({
    where: { id: localReleaseId },
    select: { labelgridId: true },
  });
  if (!release?.labelgridId) {
    return { ok: false as const, error: "Not synced to LabelGrid" };
  }
  try {
    await refreshReleaseQualityReport(release.labelgridId);
    await prisma.release.update({
      where: { id: localReleaseId },
      data: { qcChecksInProgress: true, qcStatus: "pending" },
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof LabelGridApiError) {
      return {
        ok: false as const,
        error: labelGridApiErrorMessage(error),
      };
    }
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Refresh failed",
    };
  }
}

export function parseCachedQcReport(json: string | null | undefined): QcReportSnapshot | null {
  if (!json || json === "{}") return null;
  try {
    const parsed = JSON.parse(json) as Partial<QcReportSnapshot>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      enabled: parsed.enabled !== false,
      status: parsed.enabled === false ? "not_enabled" : deriveQcStatus({
        checksInProgress: Boolean(parsed.checksInProgress), stale: Boolean(parsed.stale),
        hold: Boolean(parsed.hold), generatedAt: parsed.generatedAt ?? null,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      }),
      stale: Boolean(parsed.stale),
      checksInProgress: Boolean(parsed.checksInProgress),
      hold: Boolean(parsed.hold),
      generatedAt: parsed.generatedAt ?? null,
      reviewStatus: parsed.reviewStatus ?? null,
      releaseStatus: parsed.releaseStatus ?? null,
      profile: parsed.profile ?? null,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      raw: parsed.raw ?? parsed,
    };
  } catch {
    return null;
  }
}
