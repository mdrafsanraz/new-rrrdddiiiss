import { normalizeReleaseStatus, RELEASE_STATUSES } from "./status";

/** Position is inferred from recorded lifecycle state, never a QC pass claim. */
export function adminReviewPipeline(status: string) {
  if (!(RELEASE_STATUSES as readonly string[]).includes(status)) {
    return { stage: null, message: "Unrecognized release status. Refresh provider data before proceeding." };
  }
  const normalized = normalizeReleaseStatus(status);
  const stage = ({
    draft: 0, incomplete: 0, ready_to_submit: 0,
    pending_internal_review: 1, internal_changes_required: 1, internal_rejected: 1,
    internal_approved: 2, submitting_to_labelgrid: 2, labelgrid_preflight: 2,
    labelgrid_in_review: 3, labelgrid_changes_required: 3, labelgrid_rejected: 3,
    labelgrid_approved: 4, delivering: 4, live: 5,
  } as Record<string, number>)[normalized] ?? null;
  const messages: Record<string, string> = {
    draft: "Awaiting the user's submission.",
    incomplete: "The user needs to finish the release before submission.",
    ready_to_submit: "Ready for the user to submit to RDISTRO.",
    pending_internal_review: "Review the media, credits and evidence, then make your RDISTRO decision.",
    internal_changes_required: "Waiting for the user to edit the release and resubmit.",
    internal_rejected: "Final internal rejection. This release cannot proceed.",
    internal_approved: "RDISTRO approved. Awaiting submission to LabelGrid.",
    submitting_to_labelgrid: "Submission to LabelGrid is in progress.",
    labelgrid_preflight: "Review the current Preflight report, then confirm it into LabelGrid review.",
    labelgrid_in_review: "LabelGrid is reviewing this release. Monitor feedback and status updates.",
    labelgrid_changes_required: "Review LabelGrid's feedback and collect the requested documents or notes.",
    labelgrid_rejected: "LabelGrid rejected this release. Review the provider feedback.",
    labelgrid_approved: "LabelGrid approved. Monitor delivery to the selected stores.",
    delivering: "Delivery is underway. Check individual store responses.",
    live: "Release is live. Store-level delivery may still include exceptions.",
    takedown_pending: "A takedown is in progress. Follow the delivery response for store-level changes.",
    taken_down: "This release has been taken down.",
    on_hold: "This release is on hold. Review the recorded reason before proceeding.",
    sync_error: "Sync needs attention. Check the error and refresh provider data before proceeding.",
  };
  return { stage, message: messages[normalized] ?? "Review the recorded status and provider response before proceeding." };
}
