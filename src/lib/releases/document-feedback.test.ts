import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("user document replies stay local and preserve their note for admin review", () => {
  const route = readFileSync("src/app/api/releases/[id]/documents/route.ts", "utf8");
  assert.doesNotMatch(route, /from ["']@\/lib\/labelgrid/);
  assert.doesNotMatch(route, /postReviewIssueNote|syncedNotePosted:\s*true/);
  assert.match(route, /User note: \$\{note\}/);
  assert.match(route, /awaitingAdminReview: true/);
  assert.match(route, /notePosted: false/);
});
