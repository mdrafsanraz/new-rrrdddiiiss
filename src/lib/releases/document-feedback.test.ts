import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("retired document uploads direct owners to support without storing files or posting provider feedback", () => {
  const route = readFileSync("src/app/api/releases/[id]/documents/route.ts", "utf8");
  assert.doesNotMatch(route, /from ["']@\/lib\/labelgrid/);
  assert.doesNotMatch(route, /postReviewIssueNote|saveGenericUpload|releaseDocument\.create|request\.formData/);
  assert.match(route, /userId: user\.id/);
  assert.match(route, /status: 410/);
  assert.match(route, /supportUrl:/);
});
