/** Local release lifecycle — two review layers: RDISTRO internal, then LabelGrid. */
export const RELEASE_STATUSES = [
  "draft",
  "incomplete",
  "ready_to_submit",
  "pending_internal_review",
  "internal_changes_required",
  "internal_rejected",
  "internal_approved",
  "submitting_to_labelgrid",
  "labelgrid_in_review",
  "labelgrid_changes_required",
  "labelgrid_rejected",
  "labelgrid_approved",
  "delivering",
  "live",
  "takedown_pending",
  "taken_down",
  "sync_error",
  "on_hold",
  // Legacy values kept for DB rows written before the two-layer model.
  "submitted",
  "in_review",
  "changes_required",
  "rejected",
  "approved",
  "syncing",
  "error",
] as const;

export type ReleaseStatusValue = (typeof RELEASE_STATUSES)[number];

/** LabelGrid ReviewStatus from OpenAPI (document.json). */
export const LABELGRID_REVIEW_STATUSES = [
  "draft",
  "approved",
  "to_review",
  "rejected",
  "require_changes",
  "audit",
  "pending_customer_review",
] as const;

export type LabelGridReviewStatus = (typeof LABELGRID_REVIEW_STATUSES)[number];

/** Overall delivery state from GET /releases/{id}/delivery-status. */
export const LABELGRID_DELIVERY_STATES = [
  "not_submitted",
  "in_progress",
  "live",
  "removing",
  "removed",
  "action_needed",
] as const;

export type LabelGridDeliveryState = (typeof LABELGRID_DELIVERY_STATES)[number];

export type UserFacingStatusKey =
  | "draft"
  | "in_review"
  | "changes_required"
  | "rejected"
  | "approved"
  | "delivering"
  | "live"
  | "takedown_pending"
  | "taken_down"
  | "action_required";

export type ReleasePermissionSnapshot = {
  status: string;
  permanentlyLocked: boolean;
  submittedAt: Date | string | null;
};

/** Normalize legacy statuses into the two-layer model. */
export function normalizeReleaseStatus(status: string): ReleaseStatusValue {
  switch (status) {
    case "submitted":
    case "in_review":
      return "pending_internal_review";
    case "changes_required":
      return "internal_changes_required";
    case "rejected":
      return "internal_rejected";
    case "approved":
      return "labelgrid_in_review";
    case "syncing":
      return "submitting_to_labelgrid";
    case "error":
      return "sync_error";
    default:
      return (RELEASE_STATUSES.includes(status as ReleaseStatusValue)
        ? status
        : "draft") as ReleaseStatusValue;
  }
}

export function getUserFacingReleaseStatus(
  status: string
): UserFacingStatusKey {
  const s = normalizeReleaseStatus(status);
  switch (s) {
    case "draft":
    case "incomplete":
    case "ready_to_submit":
      return "draft";
    case "pending_internal_review":
    case "internal_approved":
    case "submitting_to_labelgrid":
    case "labelgrid_in_review":
      return "in_review";
    case "internal_changes_required":
    case "labelgrid_changes_required":
      return "changes_required";
    case "internal_rejected":
    case "labelgrid_rejected":
      return "rejected";
    case "labelgrid_approved":
      return "approved";
    case "delivering":
      return "delivering";
    case "live":
      return "live";
    case "takedown_pending":
      return "takedown_pending";
    case "taken_down":
      return "taken_down";
    case "sync_error":
      return "action_required";
    case "on_hold":
      return "in_review";
    default:
      return "draft";
  }
}

const USER_FACING_LABELS: Record<UserFacingStatusKey, string> = {
  draft: "Draft",
  in_review: "In Review",
  changes_required: "Changes Required",
  rejected: "Rejected",
  approved: "Approved",
  delivering: "Delivering",
  live: "Live",
  takedown_pending: "Takedown Pending",
  taken_down: "Taken Down",
  action_required: "Action Required",
};

const USER_FACING_DESCRIPTIONS: Record<UserFacingStatusKey, string> = {
  draft: "This release is still a draft and has not been submitted for review.",
  in_review:
    "Your release is being reviewed. You will be notified if anything needs attention.",
  changes_required:
    "Review found items that need attention. Fix the issues, then resubmit.",
  rejected:
    "This release was rejected and cannot be edited or resubmitted. Contact support if you believe this decision needs review.",
  approved: "Your release was approved and is preparing for delivery.",
  delivering: "Your release is being delivered to stores.",
  live: "Your release is live on stores.",
  takedown_pending: "A takedown request is in progress.",
  taken_down: "This release has been taken down from stores.",
  action_required:
    "Something needs attention on this release. Open the details for more information.",
};

export function getUserFacingStatusLabel(status: string): string {
  return USER_FACING_LABELS[getUserFacingReleaseStatus(status)];
}

export function getUserFacingStatusDescription(status: string): string {
  return USER_FACING_DESCRIPTIONS[getUserFacingReleaseStatus(status)];
}

export function isFinalRejection(release: ReleasePermissionSnapshot): boolean {
  if (release.permanentlyLocked) return true;
  const s = normalizeReleaseStatus(release.status);
  return s === "internal_rejected" || s === "labelgrid_rejected";
}

export function canUserEditRelease(release: ReleasePermissionSnapshot): boolean {
  if (isFinalRejection(release)) return false;
  const s = normalizeReleaseStatus(release.status);
  return (
    s === "draft" ||
    s === "incomplete" ||
    s === "ready_to_submit" ||
    s === "internal_changes_required" ||
    s === "labelgrid_changes_required" ||
    s === "sync_error"
  );
}

export function canUserSubmitRelease(
  release: ReleasePermissionSnapshot
): boolean {
  if (isFinalRejection(release)) return false;
  if (release.submittedAt) return false;
  const s = normalizeReleaseStatus(release.status);
  return (
    s === "draft" ||
    s === "incomplete" ||
    s === "ready_to_submit" ||
    s === "sync_error"
  );
}

export function canUserResubmitRelease(
  release: ReleasePermissionSnapshot
): boolean {
  if (isFinalRejection(release)) return false;
  const s = normalizeReleaseStatus(release.status);
  return (
    s === "internal_changes_required" || s === "labelgrid_changes_required"
  );
}

/**
 * Re-upload cover/audio when files were lost (e.g. redeploy without a volume)
 * or while waiting on internal review / sync errors — without full metadata edit.
 */
export function canUserReplaceMedia(
  release: ReleasePermissionSnapshot
): boolean {
  if (isFinalRejection(release)) return false;
  if (canUserEditRelease(release)) return true;
  const s = normalizeReleaseStatus(release.status);
  return (
    s === "pending_internal_review" ||
    s === "on_hold" ||
    s === "internal_approved" ||
    s === "sync_error"
  );
}

export function isPendingInternalReview(status: string): boolean {
  const s = normalizeReleaseStatus(status);
  return s === "pending_internal_review";
}

export function canAdminDecide(status: string, permanentlyLocked: boolean): boolean {
  if (permanentlyLocked) return false;
  const s = normalizeReleaseStatus(status);
  return (
    s === "pending_internal_review" ||
    s === "sync_error" ||
    s === "internal_approved" ||
    s === "on_hold"
  );
}

/** Admin-facing status labels (ops console — denser than user labels). */
export function getAdminStatusLabel(status: string): string {
  const s = normalizeReleaseStatus(status);
  switch (s) {
    case "draft":
    case "incomplete":
    case "ready_to_submit":
      return "Draft";
    case "pending_internal_review":
      return "Pending Review";
    case "internal_changes_required":
    case "labelgrid_changes_required":
      return "Changes Required";
    case "on_hold":
      return "On Hold";
    case "internal_approved":
    case "submitting_to_labelgrid":
      return "Approved Internally";
    case "labelgrid_in_review":
      return "LabelGrid Review";
    case "labelgrid_approved":
      return "Approved";
    case "delivering":
      return "Delivering";
    case "live":
      return "Live";
    case "internal_rejected":
    case "labelgrid_rejected":
      return "Rejected";
    case "takedown_pending":
      return "Takedown Pending";
    case "taken_down":
      return "Taken Down";
    case "sync_error":
      return "Sync Error";
    default:
      return s;
  }
}

/** Filter buckets used on the user releases list (user-facing keys). */
export function statusesForUserFacingFilter(
  filter: string
): string[] | null {
  switch (filter) {
    case "draft":
      return ["draft", "incomplete", "ready_to_submit"];
    case "in_review":
      return [
        "pending_internal_review",
        "submitted",
        "in_review",
        "internal_approved",
        "submitting_to_labelgrid",
        "syncing",
        "labelgrid_in_review",
        "approved",
      ];
    case "changes_required":
      return [
        "internal_changes_required",
        "changes_required",
        "labelgrid_changes_required",
      ];
    case "approved":
      return ["labelgrid_approved"];
    case "delivering":
      return ["delivering"];
    case "live":
      return ["live"];
    case "rejected":
      return ["internal_rejected", "rejected", "labelgrid_rejected"];
    case "taken_down":
      return ["takedown_pending", "taken_down"];
    case "action_required":
      return ["sync_error", "error"];
    default:
      return null;
  }
}

/**
 * Map LabelGrid ReviewStatus → local ReleaseStatus.
 * Only used once the release has been submitted to LabelGrid review.
 */
export function mapLabelGridStatusToLocalStatus(
  reviewStatus: string | null | undefined,
  deliveryState?: string | null
): ReleaseStatusValue | null {
  if (deliveryState === "live") return "live";
  if (deliveryState === "removing") return "takedown_pending";
  if (deliveryState === "removed") return "taken_down";
  if (deliveryState === "in_progress") return "delivering";
  if (deliveryState === "action_needed") return "sync_error";

  switch (reviewStatus) {
    case "draft":
      // Still a LG draft — local layer owns the story before distribute.
      return null;
    case "to_review":
    case "audit":
    case "pending_customer_review":
      return "labelgrid_in_review";
    case "require_changes":
      return "labelgrid_changes_required";
    case "rejected":
      return "labelgrid_rejected";
    case "approved":
      if (deliveryState === "in_progress") return "delivering";
      if (deliveryState === "live") return "live";
      return "labelgrid_approved";
    default:
      return null;
  }
}
