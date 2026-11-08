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
    description: "All recorded Preflight QC states, excluding reports marked Not on hold. Review pending, stale and completed reports before confirming into LabelGrid review.",
    statuses: ["labelgrid_preflight"],
    action: "Review Preflight QC",
  },
} as const;

export type ReviewQueueStage = keyof typeof reviewQueueStages;

/** QC cache determines this queue, independently of the release lifecycle status. */
export function reviewQueueWhere(stage: ReviewQueueStage): Prisma.ReleaseWhereInput {
  if (stage === "pending") return { status: { in: [...reviewQueueStages.pending.statuses] } };
  return {
    labelgridId: { not: null },
    qcEnabled: true,
    OR: [
      { qcStatus: { notIn: ["not_held", "not_enabled"] } },
      // Newly entered holds can precede the first cached report.
      { status: "labelgrid_preflight", qcStatus: null },
    ],
  };
}

export function parseReviewQueueStage(value: unknown): ReviewQueueStage | null {
  return value === "pending" || value === "preflight" ? value : null;
}
