import assert from "node:assert/strict";
import test from "node:test";
import { getReviewActions, isDocumentRequest } from "./review-workflow";

const release = { status: "internal_changes_required", permanentlyLocked: false, submittedAt: new Date() };
const feedback = { source: "LABELGRID", requiresDocument: true, resolved: false, documents: [] };
const document = { source: "INTERNAL", requiresDocument: true, resolved: false, documents: [] as { id: string }[] };

test("LabelGrid feedback uses documents and notes rather than the editor", () => {
  const providerRelease = { ...release, status: "labelgrid_changes_required" };
  assert.equal(isDocumentRequest(feedback), true);
  assert.deepEqual(getReviewActions(providerRelease, [feedback]), { canEdit: false, canResubmit: false });
  assert.deepEqual(getReviewActions(providerRelease, [{ ...feedback, documents: [{ id: "file" }] }]), { canEdit: false, canResubmit: true });
});
test("RDISTRO changes remain editable even with earlier provider feedback", () => {
  assert.equal(getReviewActions(release, [feedback]).canEdit, true);
});
test("document requests never hide editing and require an upload for standalone resubmit", () => {
  assert.deepEqual(getReviewActions(release, [document]), { canEdit: true, canResubmit: false });
  assert.deepEqual(getReviewActions(release, [{ ...document, documents: [{ id: "file" }] }]), { canEdit: true, canResubmit: true });
});
test("mixed feedback and documents must go through the editor", () => {
  const internalFeedback = { ...feedback, source: "INTERNAL", requiresDocument: false };
  assert.deepEqual(getReviewActions(release, [internalFeedback, { ...document, documents: [{ id: "file" }] }]), { canEdit: true, canResubmit: false });
});
test("resolved document issues do not enable standalone resubmit", () => {
  assert.deepEqual(getReviewActions(release, [{ ...document, resolved: true }]), { canEdit: true, canResubmit: false });
});
test("all changes-required statuses remain editable, but final rejection stays locked", () => {
  for (const status of ["internal_changes_required", "labelgrid_changes_required", "changes_required"]) {
    assert.equal(getReviewActions({ ...release, status }, []).canEdit, true);
  }
  for (const status of ["internal_rejected", "labelgrid_rejected", "pending_internal_review"]) {
    assert.deepEqual(getReviewActions({ ...release, status }, [document]), { canEdit: false, canResubmit: false });
  }
  assert.equal(getReviewActions({ ...release, permanentlyLocked: true }, []).canEdit, false);
});
