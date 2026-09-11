import assert from "node:assert/strict";
import test from "node:test";
import { parseReviewQueueStage, reviewQueueStages } from "./review-queue";

test("approval stages have separate status sets", () => {
  assert.deepEqual(reviewQueueStages.pending.statuses, ["pending_internal_review", "submitted", "in_review"]);
  assert.deepEqual(reviewQueueStages.preflight.statuses, ["labelgrid_preflight"]);
  const internal = new Set<string>(reviewQueueStages.pending.statuses);
  assert.ok(reviewQueueStages.preflight.statuses.every((status) => !internal.has(status)));
});

test("queue navigation accepts only known stages", () => {
  assert.equal(parseReviewQueueStage("pending"), "pending");
  assert.equal(parseReviewQueueStage("preflight"), "preflight");
  for (const value of [undefined, null, "approved", "labelgrid_in_review", ["preflight"]]) {
    assert.equal(parseReviewQueueStage(value), null);
  }
});
