import assert from "node:assert/strict";
import test from "node:test";
import { deriveQcStatus, safeEvidenceUrl, qcConfirmationError } from "./qc-state";
import { getUserFacingReleaseStatus, getAdminStatusLabel, mapLabelGridStatusToLocalStatus } from "../releases/status";
import type { QcIssue } from "./quality-report";

const report = { generatedAt: "2026-09-09T07:58:07+00:00", checksInProgress: false, stale: false, hold: false, issues: [] as QcIssue[] };
test("confirmation requires enabled, held, completed, current report", () => {
  const ready = { ...report, hold: true, enabled: true };
  assert.equal(qcConfirmationError(ready), null);
  for (const override of [{ hold: false }, { enabled: false }, { checksInProgress: true }, { stale: true }, { generatedAt: null }]) assert.ok(qcConfirmationError({ ...ready, ...override }));
});
test("preflight hold is distinct for admin but remains in review for user", () => {
  assert.equal(mapLabelGridStatusToLocalStatus("pending_customer_review", null), "labelgrid_preflight");
  assert.equal(getUserFacingReleaseStatus("labelgrid_preflight"), "in_review");
  assert.equal(getAdminStatusLabel("labelgrid_preflight"), "Preflight QC Hold");
});
test("live response outside hold is not a pass", () => assert.equal(deriveQcStatus(report), "not_held"));
test("only completed fresh held reports can pass", () => {
  assert.equal(deriveQcStatus({ ...report, hold: true }), "passed");
  assert.equal(deriveQcStatus({ ...report, hold: true, generatedAt: null }), "not_run");
  assert.equal(deriveQcStatus({ ...report, hold: true, stale: true }), "stale");
  assert.equal(deriveQcStatus({ ...report, hold: true, stale: true, checksInProgress: true }), "pending");
});
test("blocking flags govern findings", () => {
  const issue = { isBlocking: false } as QcIssue;
  assert.equal(deriveQcStatus({ ...report, hold: true, issues: [issue] }), "warning");
  assert.equal(deriveQcStatus({ ...report, hold: true, issues: [{ ...issue, isBlocking: true }] }), "review_required");
});
test("evidence links reject executable or malformed URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "/relative", null]) assert.equal(safeEvidenceUrl(url), null);
  assert.equal(safeEvidenceUrl("https://example.com/track"), "https://example.com/track");
});
