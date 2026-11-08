import type { Prisma } from "@prisma/client";

export const reviewQueueStages = {
  pending: {
    label: "Internal approval",
    description: "Review user submissions, then approve and send to LabelGrid for Preflight QC.",
    statuses: ["pending_internal_review", "submitted", "in_review"],
    action: "Review submission",
  },
  preflight: {
    label: "Preflight QC confirmation",
    description: "Releases in LabelGrid review with recorded Preflight QC reports. Reports marked Not on hold are excluded.",
    statuses: ["labelgrid_in_review"],
    action: "Review Preflight QC",
  },
} as const;

export type ReviewQueueStage = keyof typeof reviewQueueStages;

/** Preflight reports are scoped to releases currently in LabelGrid review. */
export function reviewQueueWhere(stage: ReviewQueueStage): Prisma.ReleaseWhereInput {
  if (stage === "pending") return { status: { in: [...reviewQueueStages.pending.statuses] } };
  return {
    status: { in: [...reviewQueueStages.preflight.statuses] },
    labelgridId: { not: null },
    qcEnabled: true,
    qcStatus: { notIn: ["not_held", "not_enabled"] },
  };
}

export function parseReviewQueueStage(value: unknown): ReviewQueueStage | null {
  return value === "pending" || value === "preflight" ? value : null;
}
