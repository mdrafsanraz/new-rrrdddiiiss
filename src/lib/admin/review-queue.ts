export const reviewQueueStages = {
  pending: {
    label: "Internal approval",
    description: "Review user submissions, then approve and send to LabelGrid for Preflight QC.",
    statuses: ["pending_internal_review", "submitted", "in_review"],
    action: "Review submission",
  },
  preflight: {
    label: "Preflight QC confirmation",
    description: "Review LabelGrid’s analysis, resolve any issues or stale reports, then confirm into LabelGrid review.",
    statuses: ["labelgrid_preflight"],
    action: "Review Preflight QC",
  },
} as const;

export type ReviewQueueStage = keyof typeof reviewQueueStages;

export function parseReviewQueueStage(value: unknown): ReviewQueueStage | null {
  return value === "pending" || value === "preflight" ? value : null;
}
