import assert from "node:assert/strict";
import test from "node:test";
import { releaseSupportDraft } from "./support-draft";
import { getUserFacingStatusDescription } from "./status";

test("ticket draft includes release reference, reviewer note and unresolved feedback only", () => {
  const draft = releaseSupportDraft({
    id: "release-123", title: "My Release", reviewNotes: "Correct the artist credits.",
    reviewIssues: [
      { title: "License", message: "Provide proof of rights.", resolved: false },
      { title: "Old issue", message: "Already fixed", resolved: true },
    ],
  });
  assert.equal(draft.initialCategory, "release");
  assert.equal(draft.initialSubject, "Changes required: My Release");
  assert.match(draft.initialBody, /release-123/);
  assert.match(draft.initialBody, /Correct the artist credits\./);
  assert.match(draft.initialBody, /Provide proof of rights\./);
  assert.doesNotMatch(draft.initialBody, /Already fixed/);
  assert.ok(draft.initialBody.endsWith("My reply:\n"));
});

test("missing feedback and oversized notes still produce a usable ticket", () => {
  const empty = releaseSupportDraft({ id: "r", title: "Release", reviewNotes: null, reviewIssues: [] });
  assert.match(empty.initialBody, /No detailed feedback/);
  const long = releaseSupportDraft({ id: "r", title: "Title".repeat(100), reviewNotes: "Note".repeat(5000), reviewIssues: [] });
  assert.ok(long.initialSubject.length <= 160);
  assert.ok(long.initialBody.length < 8000);
});

test("release links prefill the actual catalog number or UPC without inventing an identifier", () => {
  const release = { id: "r", title: "Release", reviewNotes: null, reviewIssues: [] };
  assert.equal(releaseSupportDraft({ ...release, catalogNumber: "CAT123", upc: "123456789012" }).initialReference, "CAT123");
  assert.equal(releaseSupportDraft({ ...release, upc: "123456789012" }).initialReference, "123456789012");
  assert.equal(releaseSupportDraft(release).initialReference, "");
});

test("both changes-required flows direct users to support", () => {
  for (const status of ["internal_changes_required", "labelgrid_changes_required", "changes_required"]) {
    assert.match(getUserFacingStatusDescription(status), /support ticket/);
  }
});
