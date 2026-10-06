import assert from "node:assert/strict";
import test from "node:test";
import { artistSelectionError, buildArtistCredits } from "./artist-credits";

test("primary, additional main and featured artists retain roles and order", () => {
  assert.deepEqual(buildArtistCredits(1, [2, 3], [4, 5]), [
    { artist_id: 1, artistic_role: "MainArtist", position: 1 },
    { artist_id: 2, artistic_role: "MainArtist", position: 2 },
    { artist_id: 3, artistic_role: "MainArtist", position: 3 },
    { artist_id: 4, artistic_role: "FeaturedArtist", position: 4 },
    { artist_id: 5, artistic_role: "FeaturedArtist", position: 5 },
  ]);
  assert.equal(artistSelectionError("1", ["2"], ["3"]), null);
});

test("duplicate credits and mixed roles for one artist are rejected", () => {
  assert.ok(artistSelectionError("1", ["1"], []));
  assert.ok(artistSelectionError("1", [], ["1"]));
  assert.ok(artistSelectionError("1", ["2"], ["2"]));
  assert.ok(artistSelectionError("1", [], ["2", "2"]));
  assert.throws(() => buildArtistCredits(1, [2], [2]), /same LabelGrid profile/);
});

test("removing featured artists produces a complete replacement without featured credits", () => {
  assert.deepEqual(buildArtistCredits(1, [], []), [
    { artist_id: 1, artistic_role: "MainArtist", position: 1 },
  ]);
});
