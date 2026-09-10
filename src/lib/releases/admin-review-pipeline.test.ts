import assert from "node:assert/strict";
import test from "node:test";
import { adminReviewPipeline } from "./admin-review-pipeline";

test("positions the two review layers and Preflight separately", () => {
  assert.equal(adminReviewPipeline("pending_internal_review").stage, 1);
  assert.equal(adminReviewPipeline("labelgrid_preflight").stage, 2);
  assert.equal(adminReviewPipeline("labelgrid_in_review").stage, 3);
  assert.equal(adminReviewPipeline("delivering").stage, 4);
  assert.equal(adminReviewPipeline("live").stage, 5);
});
test("changes required identifies the correct owner and next action", () => {
  assert.match(adminReviewPipeline("internal_changes_required").message, /edit.*resubmit/);
  assert.match(adminReviewPipeline("labelgrid_changes_required").message, /documents or notes/);
});
test("exceptions do not invent a completed or current pipeline stage", () => {
  for (const status of ["on_hold", "sync_error", "taken_down", "takedown_pending", "unknown"]) {
    assert.equal(adminReviewPipeline(status).stage, null);
  }
});
test("legacy review values are normalized", () => {
  assert.equal(adminReviewPipeline("submitted").stage, 1);
  assert.equal(adminReviewPipeline("in_review").stage, 1);
  assert.equal(adminReviewPipeline("approved").stage, 3);
});
