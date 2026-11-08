import assert from "node:assert/strict";
import test from "node:test";
import { parseReviewQueueStage, reviewQueueWhere } from "./review-queue";

test("internal queue still selects submissions awaiting RDISTRO approval", () => {
  assert.deepEqual(reviewQueueWhere("pending"), { status: { in: ["pending_internal_review", "submitted", "in_review"] } });
});

test("Preflight includes recorded QC states regardless of lifecycle and excludes Not on hold", () => {
  const where = reviewQueueWhere("preflight");
  assert.equal(where.status, undefined);
  assert.deepEqual(where, {
    labelgridId: { not: null }, qcEnabled: true,
    OR: [
      { qcStatus: { notIn: ["not_held", "not_enabled"] } },
      { status: "labelgrid_preflight", qcStatus: null },
    ],
  });
});

test("queue navigation accepts only known stages", () => {
  assert.equal(parseReviewQueueStage("pending"), "pending");
  assert.equal(parseReviewQueueStage("preflight"), "preflight");
  for (const value of [undefined, null, "approved", "labelgrid_in_review", ["preflight"]]) {
    assert.equal(parseReviewQueueStage(value), null);
  }
});
