import assert from "node:assert/strict";
import test from "node:test";
import { adminReleaseWhere } from "./release-filters";
import { reviewQueueWhere } from "./review-queue";

test("LabelGrid review shortcut excludes Preflight and awaiting submission stages", () => {
  assert.deepEqual(adminReleaseWhere("labelgrid_in_review").AND, [{ status: "labelgrid_in_review" }]);
});

test("Preflight list uses the queue predicate, preserving search and ownership constraints", () => {
  const where = adminReleaseWhere("preflight", "QT123", { user: "artist@example.com", qc: "yes" });
  assert.ok(Array.isArray(where.AND));
  assert.deepEqual(where.AND[0], reviewQueueWhere("preflight"));
  assert.equal(where.AND.length, 4);
  assert.match(JSON.stringify(where.AND[1]), /QT123/);
  assert.match(JSON.stringify(where.AND[2]), /artist@example.com/);
  assert.deepEqual(where.AND[3], { qcStatus: { in: ["warning", "review_required", "failed"] } });
  assert.deepEqual(adminReleaseWhere("pending_review").AND, [
    { status: { in: ["pending_internal_review", "submitted", "in_review"] } },
  ]);
});
