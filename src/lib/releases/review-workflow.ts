import { canUserEditRelease, canUserResubmitRelease, normalizeReleaseStatus } from "./status";

type ReviewIssue = {
  source: string;
  requiresDocument: boolean;
  resolved: boolean;
  documents?: readonly { id: string }[];
};

/** Requested documents also include LabelGrid's document-and-note feedback flow. */
export function isDocumentRequest(issue: Pick<ReviewIssue, "source" | "requiresDocument">) {
  return issue.requiresDocument;
}

export function getReviewActions(
  release: Parameters<typeof canUserEditRelease>[0],
  issues: readonly ReviewIssue[],
) {
  const open = issues.filter((issue) => !issue.resolved);
  const documentsOnly = open.length > 0 && open.every(isDocumentRequest);
  const providerFeedback = normalizeReleaseStatus(release.status) === "labelgrid_changes_required" &&
    open.some((issue) => issue.source === "LABELGRID" && issue.requiresDocument);
  return {
    canEdit: canUserEditRelease(release) && !providerFeedback,
    // Metadata feedback must go through the editor, even alongside documents.
    canResubmit: canUserResubmitRelease(release) && documentsOnly &&
      open.every((issue) => (issue.documents?.length ?? 0) > 0),
  };
}
