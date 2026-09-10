import assert from "node:assert/strict";
import test from "node:test";
import { verifySubmissionMedia } from "./submission-media";

const release = { labelgridId: "1", tracks: [{ labelgridId: "2" }] };
const ready = { releaseId: 1, hasCover: true, tracks: [{ id: 2, hasStereo: true }] };

test("allows verified artwork and every expected track", async () => {
  assert.equal(await verifySubmissionMedia(release, async () => ready), null);
});
test("blocks missing artwork, missing audio, and mismatched track IDs", async () => {
  for (const media of [
    { ...ready, hasCover: false },
    { ...ready, tracks: [] },
    { ...ready, tracks: [{ id: 2, hasStereo: false }] },
    { ...ready, tracks: [{ id: 3, hasStereo: true }] },
  ]) {
    assert.equal((await verifySubmissionMedia(release, async () => media))?.status, 409);
  }
});
test("provider failures are unverifiable, not missing media", async () => {
  const result = await verifySubmissionMedia(release, async () => { throw new Error("429"); });
  assert.equal(result?.status, 503);
  assert.match(result!.error, /Unable to verify/);
});
test("unsynced tracks cannot pass", async () => {
  assert.equal((await verifySubmissionMedia({ ...release, tracks: [{ labelgridId: null }] }, async () => ready))?.status, 409);
});
