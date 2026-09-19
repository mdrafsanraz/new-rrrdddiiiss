import assert from "node:assert/strict";
import test from "node:test";
import { canAdminResubmitMetadata, metadataResubmitError } from "./admin-resubmit";
import { getUserFacingReleaseStatus, canUserEditRelease } from "./status";

test("withdrawn provider drafts stay in RDISTRO review and allow admin resubmission", () => {
  assert.equal(getUserFacingReleaseStatus("internal_approved"), "in_review");
  assert.equal(canAdminResubmitMetadata("internal_approved", false, true), true);
  assert.equal(canUserEditRelease({ status: "internal_approved", permanentlyLocked: false, submittedAt: new Date() }), false);
});

test("resubmission excludes locked, unmapped, live and internal-review releases", () => {
  assert.equal(canAdminResubmitMetadata("labelgrid_in_review", false, true), true);
  for (const status of ["live", "delivering", "pending_internal_review", "labelgrid_rejected"]) assert.equal(canAdminResubmitMetadata(status, false, true), false);
  assert.equal(canAdminResubmitMetadata("draft", true, true), false);
  assert.equal(canAdminResubmitMetadata("draft", false, false), false);
});
test("provider state must allow editing; review and preflight are separate workflows", () => {
  assert.equal(metadataResubmitError("draft"), null);
  assert.equal(metadataResubmitError("require_changes"), null);
  assert.match(metadataResubmitError("to_review")!, /Withdraw/);
  assert.match(metadataResubmitError("pending_customer_review")!, /Preflight/);
  assert.ok(metadataResubmitError("approved"));
  assert.ok(metadataResubmitError(null));
  assert.ok(metadataResubmitError("draft", "distributed"));
});
