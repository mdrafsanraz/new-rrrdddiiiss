import { prisma } from "@/lib/db";
import { labelgridFetch } from "@/lib/labelgrid/client";
import { getRelease } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  mapLabelGridStatusToLocalStatus,
  normalizeReleaseStatus,
  type ReleaseStatusValue,
} from "@/lib/releases/status";

/** LabelGrid review issue shape from GET /review-issues (document.json). */
export type LabelGridReviewIssue = {
  id: string;
  code: string;
  title: string | null;
  message: string | null;
  status: string;
  severity: string;
  is_blocking: boolean;
  requires_feedback: boolean;
  custom_description: string | null;
  affected_tracks: Array<{
    id: number;
    title: string;
    mix_version: string;
  }>;
  evidence?: Array<Record<string, unknown>>;
  notes: Array<{
    id: number;
    author_role: string;
    text: string;
    submitted_at: string | null;
    verdict: string | null;
  }>;
};

export type LabelGridDeliveryStatusResponse = {
  release_id: number;
  state: string;
  currently_live?: boolean;
  ever_submitted?: boolean;
  ever_delivered?: boolean;
  outlets?: unknown[];
};

export async function fetchLabelGridReviewIssues(
  labelgridReleaseId: string | number
): Promise<LabelGridReviewIssue[]> {
  const raw = await labelgridFetch<{ data?: LabelGridReviewIssue[] }>(
    "/review-issues",
    { searchParams: { release_id: String(labelgridReleaseId) } }
  );
  if (Array.isArray(raw)) return raw as LabelGridReviewIssue[];
  return raw?.data ?? [];
}

export async function fetchLabelGridDeliveryStatus(
  labelgridReleaseId: string | number
): Promise<LabelGridDeliveryStatusResponse | null> {
  try {
    const raw = await labelgridFetch<
      LabelGridDeliveryStatusResponse | { data: LabelGridDeliveryStatusResponse }
    >(`/releases/${labelgridReleaseId}/delivery-status`);
    if (raw && typeof raw === "object" && "data" in raw) {
      return (raw as { data: LabelGridDeliveryStatusResponse }).data;
    }
    return raw as LabelGridDeliveryStatusResponse;
  } catch {
    return null;
  }
}

function categoryFromIssue(issue: LabelGridReviewIssue): string {
  const code = (issue.code || "").toLowerCase();
  if (code.includes("art") || code.includes("cover") || code.includes("image")) {
    return "Artwork";
  }
  if (code.includes("audio") || code.includes("track") || code.includes("isrc")) {
    return "Track";
  }
  if (code.includes("artist")) return "Artist";
  if (code.includes("right") || code.includes("license") || code.includes("own")) {
    return "Rights";
  }
  if (code.includes("meta") || code.includes("title") || code.includes("genre")) {
    return "Metadata";
  }
  return "Review";
}

/** Upsert LabelGrid review issues into local DB (user-facing copy only). */
export async function syncLabelGridReviewIssues(
  releaseId: string,
  labelgridReleaseId: string | number
) {
  const issues = await fetchLabelGridReviewIssues(labelgridReleaseId);
  const tracks = await prisma.track.findMany({
    where: { releaseId },
    select: { id: true, labelgridId: true },
  });
  const trackByLg = new Map(
    tracks
      .filter((t) => t.labelgridId)
      .map((t) => [t.labelgridId!, t.id] as const)
  );

  const seen = new Set<string>();

  for (const issue of issues) {
    seen.add(issue.id);
    const providerTrackId = issue.affected_tracks?.[0]?.id ?? null;
    const affectedTrackId = providerTrackId
      ? trackByLg.get(String(providerTrackId)) ?? null
      : null;

    const existing = await prisma.releaseReviewIssue.findFirst({
      where: { releaseId, providerIssueId: issue.id },
    });

    const data = {
      source: "LABELGRID" as const,
      providerIssueId: issue.id,
      code: issue.code,
      category: categoryFromIssue(issue),
      title: issue.title,
      message:
        issue.custom_description?.trim() ||
        issue.message?.trim() ||
        issue.title?.trim() ||
        "Review feedback requires attention.",
      severity: issue.severity,
      isBlocking: issue.is_blocking,
      requiresFeedback: issue.requires_feedback,
      // OpenAPI has no document-upload endpoint on issues; treat feedback as
      // potentially needing supporting materials we store locally.
      requiresDocument: issue.requires_feedback,
      affectedTrackId,
      providerTrackId,
      status: issue.status,
      resolved: String(issue.status).toLowerCase() === "resolved",
      resolvedAt:
        String(issue.status).toLowerCase() === "resolved" ? new Date() : null,
      evidenceJson: JSON.stringify(issue.evidence ?? []),
      notesJson: JSON.stringify(issue.notes ?? []),
      rawJson: JSON.stringify(issue),
    };

    if (existing) {
      await prisma.releaseReviewIssue.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.releaseReviewIssue.create({
        data: { releaseId, ...data },
      });
    }
  }

  // Mark provider issues that disappeared as resolved (best-effort).
  await prisma.releaseReviewIssue.updateMany({
    where: {
      releaseId,
      source: "LABELGRID",
      providerIssueId: { not: null, notIn: [...seen] },
      resolved: false,
    },
    data: { resolved: true, resolvedAt: new Date(), status: "resolved" },
  });

  return issues;
}

type ApplyOpts = {
  /** When true, also fetch delivery-status + review issues. */
  deep?: boolean;
  /** Force activity log even if status unchanged. */
  forceLog?: boolean;
  actorUserId?: string | null;
};

/**
 * Pull LabelGrid review_status (+ optional delivery) into our DB.
 * Never renders user UI from raw LG — always write local first.
 */
export async function reconcileLabelGridReleaseStatus(
  releaseId: string,
  opts: ApplyOpts = {}
): Promise<{
  ok: boolean;
  status?: ReleaseStatusValue;
  reviewStatus?: string | null;
  deliveryState?: string | null;
  error?: string;
}> {
  if (!isLabelGridLive()) {
    return { ok: false, error: "LabelGrid not configured" };
  }

  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release?.labelgridId) {
    return { ok: false, error: "Release has no LabelGrid id" };
  }

  // Only reconcile after we've submitted to LabelGrid review (or beyond).
  const local = normalizeReleaseStatus(release.status);
  const pastInternal =
    local === "submitting_to_labelgrid" ||
    local === "labelgrid_in_review" ||
    local === "labelgrid_changes_required" ||
    local === "labelgrid_rejected" ||
    local === "labelgrid_approved" ||
    local === "delivering" ||
    local === "live" ||
    local === "takedown_pending" ||
    local === "taken_down" ||
    local === "sync_error" ||
    // Legacy approve path
    release.status === "approved" ||
    release.status === "syncing";

  if (!pastInternal && !opts.deep) {
    return { ok: true, status: local };
  }

  try {
    const lg = await getRelease(release.labelgridId);
    const data =
      lg && typeof lg === "object" && "data" in lg
        ? (lg as { data: { review_status?: string | null } }).data
        : (lg as { review_status?: string | null });
    const reviewStatus = data?.review_status ?? null;

    let deliveryState: string | null = release.deliveryState;
    let deliveryJson: string | undefined;
    if (opts.deep !== false) {
      const delivery = await fetchLabelGridDeliveryStatus(release.labelgridId);
      deliveryState = delivery?.state ?? deliveryState;
      if (delivery) {
        deliveryJson = JSON.stringify(delivery);
      }
    }

    const mapped = mapLabelGridStatusToLocalStatus(
      reviewStatus,
      deliveryState
    );

    // Do not overwrite local status with null (LG still draft) once past distribute.
    const nextStatus = mapped ?? local;

    const permanentlyLocked =
      nextStatus === "labelgrid_rejected" ? true : release.permanentlyLocked;

    const statusChanged =
      normalizeReleaseStatus(release.status) !== nextStatus;

    await prisma.release.update({
      where: { id: releaseId },
      data: {
        ...(mapped ? { status: nextStatus } : {}),
        labelgridReviewStatus: reviewStatus,
        deliveryState,
        ...(deliveryJson ? { deliveryJson } : {}),
        lastSyncedAt: new Date(),
        permanentlyLocked,
        syncError: null,
      },
    });

    if (
      reviewStatus === "require_changes" ||
      reviewStatus === "rejected" ||
      opts.deep
    ) {
      await syncLabelGridReviewIssues(releaseId, release.labelgridId);
    }

    if (statusChanged || opts.forceLog) {
      const activityType =
        nextStatus === "labelgrid_changes_required"
          ? "labelgrid_changes_required"
          : nextStatus === "labelgrid_rejected"
            ? "labelgrid_rejected"
            : nextStatus === "labelgrid_approved"
              ? "labelgrid_approved"
              : nextStatus === "delivering"
                ? "delivering"
                : nextStatus === "live"
                  ? "live"
                  : nextStatus === "taken_down"
                    ? "taken_down"
                    : nextStatus === "takedown_pending"
                      ? "takedown_requested"
                      : "labelgrid_in_review";

      await logReleaseActivity({
        releaseId,
        type: activityType,
        title: titleForStatus(nextStatus),
        description: reviewStatus
          ? `Distribution review status updated.`
          : null,
        actorUserId: opts.actorUserId,
        metadata: { reviewStatus, deliveryState },
      });
    }

    return {
      ok: true,
      status: nextStatus,
      reviewStatus,
      deliveryState,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LabelGrid sync failed";
    await prisma.release.update({
      where: { id: releaseId },
      data: { syncError: message.slice(0, 2000) },
    });
    return { ok: false, error: message };
  }
}

function titleForStatus(status: ReleaseStatusValue): string {
  switch (status) {
    case "labelgrid_changes_required":
      return "Changes required";
    case "labelgrid_rejected":
      return "Release rejected";
    case "labelgrid_approved":
      return "Approved for delivery";
    case "labelgrid_in_review":
      return "In distribution review";
    case "delivering":
      return "Delivering to stores";
    case "live":
      return "Live on stores";
    case "takedown_pending":
      return "Takedown pending";
    case "taken_down":
      return "Taken down";
    default:
      return "Status updated";
  }
}

/**
 * Apply a LabelGrid review-status webhook payload.
 * Payload fields from document.json: release_id, previous_status, new_status, review_issues?
 */
export async function applyLabelGridReviewStatusWebhook(payload: {
  release_id: number | string;
  previous_status?: string | null;
  new_status?: string | null;
  review_issues?: unknown;
  release_title?: string | null;
}) {
  const providerReleaseId = String(payload.release_id);
  const release = await prisma.release.findFirst({
    where: { labelgridId: providerReleaseId },
  });
  if (!release) {
    return { ok: false as const, error: "Release not found for LabelGrid id" };
  }

  return reconcileLabelGridReleaseStatus(release.id, {
    deep: true,
    forceLog: true,
  });
}
