export function canAdminResubmitMetadata(status: string, locked: boolean, mapped: boolean) {
  return mapped && !locked && ["draft", "ready_to_submit", "internal_changes_required", "labelgrid_changes_required", "changes_required", "sync_error", "error", "internal_approved", "labelgrid_in_review"].includes(status);
}

export function metadataResubmitError(reviewStatus: string | null | undefined, deliveryStatus?: string | null) {
  if (deliveryStatus && !["draft", "not_distributed"].includes(deliveryStatus)) return "This release has delivery activity. Use the delivery/update workflow instead of resubmission.";
  if (reviewStatus === "to_review" || reviewStatus === "audit") return "LabelGrid still has this release in review. Withdraw it from review first, save your edits, then resubmit.";
  if (reviewStatus === "pending_customer_review") return "This release is awaiting Preflight QC confirmation. Request fresh analysis after edits, then confirm the current report.";
  if (reviewStatus !== "draft" && reviewStatus !== "require_changes") return "LabelGrid has not confirmed an editable draft or changes-required state. Refresh release data before retrying.";
  return null;
}
