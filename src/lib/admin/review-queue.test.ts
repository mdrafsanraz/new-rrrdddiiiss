import assert from "node:assert/strict";
import test from "node:test";
import { parseReviewQueueStage, reviewQueueWhere } from "./review-queue";

test("internal queue still selects submissions awaiting RDISTRO approval", () => {
  assert.deepEqual(reviewQueueWhere("pending"), { status: { in: ["pending_internal_review", "submitted", "in_review"] } });
});

test("Preflight includes only LabelGrid in-review releases and excludes Not on hold", () => {
  const where = reviewQueueWhere("preflight");
  assert.deepEqual(where, {
    status: { in: ["labelgrid_in_review"] },
    labelgridId: { not: null }, qcEnabled: true,
    qcStatus: { notIn: ["not_held", "not_enabled"] },
  });
});

test("queue navigation accepts only known stages", () => {
  assert.equal(parseReviewQueueStage("pending"), "pending");
  assert.equal(parseReviewQueueStage("preflight"), "preflight");
  for (const value of [undefined, null, "approved", "labelgrid_in_review", ["preflight"]]) {
    assert.equal(parseReviewQueueStage(value), null);
  }
});
